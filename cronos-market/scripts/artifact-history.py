#!/usr/bin/env python3
"""Exact-byte, deduplicated preservation of generated RIFT ZIP/APK history.
No source/user database deletion. --prune only removes verified archived artifact copies.
"""
import argparse, hashlib, io, json, re, struct, zipfile, zlib
from pathlib import Path


def sha(data):
    return hashlib.sha256(data).hexdigest()


def content(archive, entry):
    def blob(key):
        if not re.fullmatch(r'[a-f0-9]{64}', key):
            raise ValueError('Invalid history blob ID')
        data = archive.read('blobs/' + key)
        if sha(data) != key:
            raise ValueError('Corrupt history blob')
        return data
    if entry['kind'] == 'inflate-raw':
        data = zlib.decompress(blob(entry['blob']), -15)
    else:
        data = b''.join(blob(key) for key in entry['parts'])
    if len(data) != entry['bytes'] or sha(data) != entry['sha256']:
        raise ValueError('Artifact reconstruction hash mismatch')
    return data


def load_manifest(archive):
    manifest = json.loads(archive.read('HISTORY-MANIFEST.json'))
    if manifest.get('format') != 'rift-exact-artifact-history' or manifest.get('schema') != 1:
        raise ValueError('Unsupported history format')
    for name in manifest['files']:
        if Path(name).name != name or not re.fullmatch(r'RIFT[A-Za-z0-9._-]+\.(zip|apk)', name):
            raise ValueError('Invalid artifact name')
    return manifest


def create(args):
    root = args.root.resolve()
    current = re.compile(r'(?:^|-)v' + str(args.current_version) + r'(?:[.-]|$)')
    selected = sorted(p for p in root.glob('RIFT*') if p.is_file() and p.suffix in {'.zip', '.apk'}
                      and not current.search(p.name) and p.resolve() != args.archive.resolve()
                      and 'history' not in p.name.lower())
    if not selected:
        raise ValueError('No earlier artifacts selected')
    if args.archive.exists() and not args.extend:
        raise FileExistsError('History archive exists; use --extend for verified atomic extension')
    blobs, files, apk_sources = {}, {}, {}
    if args.archive.exists():
        with zipfile.ZipFile(args.archive) as previous:
            saved = load_manifest(previous)
            for entry in saved['files'].values():
                content(previous, entry)
            files.update(saved['files'])
            for name in previous.namelist():
                if name.startswith('blobs/'):
                    data = previous.read(name)
                    if sha(data) != name[6:]:
                        raise ValueError('Corrupt prior history blob')
                    blobs[name[6:]] = data
        if any(path.name in files for path in selected):
            raise ValueError('Historical artifact name already archived; review restored duplicate manually')
    output = args.archive.with_name(args.archive.name + '.pending')
    if output.exists():
        raise FileExistsError('Pending history output exists; review before retrying')

    def add(data):
        key = sha(data)
        blobs.setdefault(key, data)
        return key

    for path in selected:
        if path.suffix != '.zip':
            continue
        raw = path.read_bytes()
        parts, cursor = [], 0
        with zipfile.ZipFile(io.BytesIO(raw)) as old:
            for info in sorted(old.infolist(), key=lambda item: item.header_offset):
                start = info.header_offset
                if raw[start:start + 4] != b'PK\x03\x04':
                    raise ValueError('Unexpected local ZIP header')
                name_len, extra_len = struct.unpack_from('<HH', raw, start + 26)
                data_start = start + 30 + name_len + extra_len
                parts.append(add(raw[cursor:data_start]))
                payload = raw[data_start:data_start + info.compress_size]
                key = add(payload)
                parts.append(key)
                cursor = data_start + info.compress_size
                if info.filename.endswith('.apk') and info.compress_type in {zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED}:
                    apk = old.read(info)
                    apk_sources[sha(apk)] = {'kind': 'inflate-raw', 'blob': key} if info.compress_type == zipfile.ZIP_DEFLATED else {'kind': 'parts', 'parts': [key]}
            parts.append(add(raw[cursor:]))
        files[path.name] = {'kind': 'parts', 'parts': parts, 'bytes': len(raw), 'sha256': sha(raw)}
    for path in selected:
        if path.suffix == '.apk':
            raw = path.read_bytes()
            digest = sha(raw)
            files[path.name] = {**apk_sources.get(digest, {'kind': 'parts', 'parts': [add(raw)]}), 'bytes': len(raw), 'sha256': digest}
    # Avoid unused raw APK blobs introduced by eager default evaluation above.
    used = {key for entry in files.values() for key in entry.get('parts', [])}
    used.update(entry['blob'] for entry in files.values() if 'blob' in entry)
    manifest = {'format': 'rift-exact-artifact-history', 'schema': 1, 'files': files,
                'warning': 'Historical artifacts, NOT current release or publication-approved source. Use current v' + str(args.current_version) + ' packages.'}
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_STORED) as archive:
        for key in sorted(used):
            archive.writestr('blobs/' + key, blobs[key])
        archive.writestr('HISTORY-MANIFEST.json', json.dumps(manifest, indent=2), compress_type=zipfile.ZIP_DEFLATED)
        archive.writestr('restore-rift-history.py', Path(__file__).read_bytes(), compress_type=zipfile.ZIP_DEFLATED)
        archive.writestr('RESTORE-INSTRUCTIONS.txt', 'Python 3, standard library only.\npython restore-rift-history.py --archive RIFT-previous-builds-history.zip --list\npython restore-rift-history.py --archive RIFT-previous-builds-history.zip --verify\npython restore-rift-history.py --archive RIFT-previous-builds-history.zip --restore EXACT_FILENAME --output restored-history\nOriginal ZIP/APK bytes and SHA-256 hashes are preserved. Restoration never overwrites an existing output file. Keep this historical archive private; use current publication candidates for source review.\n')
    with zipfile.ZipFile(output) as archive:
        if archive.testzip() is not None:
            raise ValueError('History ZIP CRC failed')
        checked = load_manifest(archive)
        for entry in checked['files'].values():
            content(archive, entry)
        for path in selected:
            if content(archive, checked['files'][path.name]) != path.read_bytes():
                raise ValueError('Original artifact comparison failed')
    output.replace(args.archive)
    inventory = {'archive': args.archive.name, 'bytes': args.archive.stat().st_size,
                 'sha256': sha(args.archive.read_bytes()), 'originalBytes': sum(entry['bytes'] for entry in files.values()),
                 'verifiedExactArtifacts': {name: {k: entry[k] for k in ['bytes', 'sha256']} for name, entry in files.items()},
                 'prunedDuplicateCopies': args.prune}
    (root / 'RIFT-history-inventory.json').write_text(json.dumps(inventory, indent=2) + '\n')
    (root / 'restore-rift-history.py').write_bytes(Path(__file__).read_bytes())
    if args.prune:
        for path in selected:
            path.unlink()
    print(json.dumps({k: v for k, v in inventory.items() if k != 'verifiedExactArtifacts'}, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path, default=Path('RIFT-previous-builds-history.zip'))
    parser.add_argument('--root', type=Path, default=Path.cwd())
    parser.add_argument('--current-version', type=int)
    parser.add_argument('--create', action='store_true')
    parser.add_argument('--prune', action='store_true')
    parser.add_argument('--extend', action='store_true', help='Verify existing history, merge new artifacts and replace atomically')
    parser.add_argument('--verify', action='store_true')
    parser.add_argument('--list', action='store_true')
    parser.add_argument('--restore')
    parser.add_argument('--output', type=Path, default=Path('restored-rift-history'))
    args = parser.parse_args()
    if args.create:
        if args.current_version is None:
            parser.error('--create requires --current-version to protect current deliverables')
        create(args)
        return
    if args.prune:
        parser.error('--prune requires --create and successful full verification')
    with zipfile.ZipFile(args.archive) as archive:
        manifest = load_manifest(archive)
        if args.restore:
            data = content(archive, manifest['files'][args.restore])
            args.output.mkdir(parents=True, exist_ok=True)
            path = args.output / args.restore
            with path.open('xb') as stream:
                stream.write(data)
            print('Verified exact restore:', path)
        elif args.verify:
            for entry in manifest['files'].values():
                content(archive, entry)
            print('Verified exact reconstruction of', len(manifest['files']), 'artifacts')
        else:
            for name, entry in manifest['files'].items():
                print(name, entry['bytes'], entry['sha256'])


if __name__ == '__main__':
    main()
