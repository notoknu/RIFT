#!/usr/bin/env python3
"""Clean, root-layout GitHub source bundle; no provider credentials or generated artifacts."""
from pathlib import Path
import hashlib, json, os, re, stat, zipfile

root = Path(__file__).resolve().parents[1]
destination = root.parent / 'RIFT-git-ready.zip'
excluded = {'.git','.android','.config','node_modules','dist','build','artifacts','cache','data','backups','.gradle','.cache','.wrangler','.secrets','.arena','.local','coverage','out','target','__pycache__','playwright-report','test-results','file-jvm'}
entries = {}

def forbidden(name):
    parts = Path(name).parts
    base = parts[-1]
    if base in {'local.properties','.surgepass','.netrc','adbkey','adbkey.pub'}: return True
    if (base.startswith('.env') and base != '.env.example') or base.startswith('.dev.vars'): return True
    return bool(re.search(r'\.(?:zip|apk|class|pem|key|keystore|jks|sqlite(?:-wal|-shm)?|db(?:-wal|-shm)?|riftbak|log|log\.old)$', name, re.I))

for folder, dirs, files in os.walk(root):
    dirs[:] = sorted(d for d in dirs if d not in excluded)
    rel_dir = Path(folder).relative_to(root)
    if str(rel_dir) == 'android/app/src/main/assets':
        dirs[:] = []
        continue
    for name in sorted(files):
        file = Path(folder) / name
        relative = file.relative_to(root).as_posix()
        if file.is_symlink(): raise ValueError('Review symlink: ' + relative)
        if forbidden(relative): continue
        if relative.startswith('checks/') and not relative.startswith('checks/fixtures/') and file.suffix not in {'.mjs','.js','.java'}: continue
        if relative == 'deployment/render-create-public-preview.json': continue  # live administrative request, not source setup
        entries['cronos-market/' + relative] = (file.read_bytes(), bool(file.stat().st_mode & stat.S_IXUSR))

for dest, source in {'.gitignore':'deployment/repository-root.gitignore','README.md':'deployment/GIT-ROOT-README.md','UPLOAD-TO-GITHUB.md':'deployment/UPLOAD-TO-GITHUB.md','.github/workflows/deploy-surge.yml':'deployment/deploy-surge.workflow.yml'}.items():
    entries[dest] = ((root/source).read_bytes(),False)

for name in ['android.yml','security.yml']:
    text = (root/'.github/workflows'/name).read_text()
    text = text.replace('permissions:\n', 'defaults:\n  run:\n    working-directory: cronos-market\npermissions:\n',1)
    text = text.replace('          cache: npm\n','          cache: npm\n          cache-dependency-path: cronos-market/package-lock.json\n')
    if name == 'android.yml':
        text = text.replace('RIFT-offline-debug-preview-and-test-evidence','RIFT-test-only-debug-preview-and-test-evidence')
        text = text.replace('            android/app/','            cronos-market/android/app/')
    entries['.github/workflows/'+name] = (text.encode(),False)

# Heuristic secret screening. Never include the actual credentials in this packaging script.
markers = [rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----', rb'\bgh[pousr]_[A-Za-z0-9]{30,}\b', rb'\bgithub_pat_[A-Za-z0-9_]{40,}\b', rb'\brnd_[A-Za-z0-9]{20,}\b', rb'\beyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b']
for name,(data,executable) in entries.items():
    if any(re.search(pattern,data) for pattern in markers): raise ValueError('Possible secret marker, contents omitted: '+name)
    if len(data)>25*1024*1024: raise ValueError('Oversize source: '+name)

manifest = '\n'.join(hashlib.sha256(data).hexdigest()+'  '+name for name,(data,_) in sorted(entries.items()))+'\n'
entries['REPOSITORY-MANIFEST.sha256'] = (manifest.encode(),False)
with zipfile.ZipFile(destination,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
    for name,(data,executable) in sorted(entries.items()):
        info=zipfile.ZipInfo(name,(2020,1,1,0,0,0));info.create_system=3
        info.external_attr=((0o100755 if executable else 0o100644)<<16)
        archive.writestr(info,data,compress_type=zipfile.ZIP_DEFLATED,compresslevel=6)
with zipfile.ZipFile(destination) as archive:
    assert archive.testzip() is None
    for line in manifest.strip().splitlines():
        digest,name=line.split('  ',1);assert hashlib.sha256(archive.read(name)).hexdigest()==digest
    assert (archive.getinfo('cronos-market/android/gradlew').external_attr>>16)&0o111
report={'file':destination.name,'bytes':destination.stat().st_size,'sha256':hashlib.sha256(destination.read_bytes()).hexdigest(),'verifiedSourceFiles':len(entries)-1,'secretHeuristicFindings':0,'licensePresent':(root/'LICENSE').exists(),'scope':'Complete clean source, not production wallet/mainnet approval. No credentials, keys, build outputs or runtime databases. Heuristics are not a secret/security certification.'}
destination.with_suffix('.checksums.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
