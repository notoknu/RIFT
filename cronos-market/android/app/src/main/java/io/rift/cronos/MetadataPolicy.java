package io.rift.cronos;
import java.net.*;
/** Canonical content-reference grammar; gateway selection is native settings only, never page input. */
public final class MetadataPolicy {
 public static final int MAX_BYTES=65536;private MetadataPolicy(){}
 public static String gateway(String value)throws Exception{if(value==null||value.length()>253)throw new IllegalArgumentException("Gateway origin limit");URI uri=NetworkPolicy.endpoint(value,true);if(uri.getPort()!=-1||!value.equals("https://"+uri.getHost())||!uri.getHost().matches("[a-z0-9.-]+"))throw new IllegalArgumentException("Use a lowercase public HTTPS gateway origin without port/path/query/credentials");return value;}
 public static String requestEndpoint(String reference,String origin)throws Exception{String canonical=endpoint(reference);return gateway(origin)+"/ipfs/"+canonical.substring("https://ipfs.io/ipfs/".length());}
 public static String endpoint(String value){
  if(value==null||value.length()>1024)throw new IllegalArgumentException("Metadata URI limit exceeded");String path;
  if(value.startsWith("ipfs://")){path=value.substring(7);if(path.startsWith("ipfs/"))path=path.substring(5);}
  else {try{URI uri=new URI(value);if(!"https".equals(uri.getScheme())||!"ipfs.io".equals(uri.getHost())||uri.getPort()!=-1||uri.getUserInfo()!=null||uri.getRawQuery()!=null||uri.getRawFragment()!=null||!uri.getRawPath().startsWith("/ipfs/"))throw new IllegalArgumentException();path=uri.getRawPath().substring(6);}catch(Exception e){throw new IllegalArgumentException("Only ipfs:// or exact https://ipfs.io/ipfs/ references are allowed");}}
  String[] parts=path.split("/",-1);if(parts.length>17||!parts[0].matches("(?:Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,119})"))throw new IllegalArgumentException("Unsupported IPFS identifier");
  for(int i=1;i<parts.length;i++)if(!parts[i].matches("[A-Za-z0-9._~-]{1,120}")||parts[i].equals(".")||parts[i].equals(".."))throw new IllegalArgumentException("Unsupported IPFS path");
  String endpoint="https://ipfs.io/ipfs/"+path;if(endpoint.length()>1024)throw new IllegalArgumentException("Normalized metadata URI exceeds limit");return endpoint;
 }
}
