package io.rift.cronos;
/** Public catalog only. No credentials, remote downloads, automatic saves or provider trust claims. */
public final class ConnectionPresets {
 private ConnectionPresets(){}
 public static final String[] RPC_LABELS={"Manual / keep saved RPC", "Cronos public RPC · no key", "PublicNode · public Cronos RPC", "dRPC · public Cronos RPC", "My provider / dedicated node · paste full HTTPS URL"};
 private static final String[] RPC_URLS={"","https://evm.cronos.org","https://cronos-evm-rpc.publicnode.com","https://cronos.drpc.org",""};
 public static String rpc(int index){if(index<0||index>=RPC_URLS.length)throw new IllegalArgumentException("Unknown RPC option");return RPC_URLS[index];}
 public static boolean publicRpc(String url){for(int i=1;i<=3;i++)if(RPC_URLS[i].equals(url))return true;return false;}
 public static final String[] SERVICE_LABELS={"Manual / existing RIFT service", "Cloudflare Worker · my deployed RIFT API", "Node hosting · my deployed RIFT API", "My server / reverse proxy · RIFT API"};
 public static String serviceHelp(int index){switch(index){case 0:return "Paste the exact HTTPS origin of your compatible RIFT service, or leave empty outside Hybrid mode. No default hosted service is supplied.";case 1:return "Deploy the included compatible Worker API first, then paste its actual HTTPS origin. A generic workers.dev address is not a configured API. Secrets belong in your host's secret storage.";case 2:return "Deploy the included Node API on your hosting account, then paste its public HTTPS origin. A static Surge frontend or Redis URL is NOT a RIFT API origin.";case 3:return "Paste your compatible RIFT API HTTPS origin. No paths, credentials or query parameters. A random NFT API is not protocol-compatible.";default:throw new IllegalArgumentException("Unknown service option");}}
}
