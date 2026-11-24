package io.rift.cronos;
import java.io.*;import java.security.*;import java.util.*;
/** Verifies ONLY pathless CIDv1 raw/sha2-256 bytes. No UnixFS/DAG traversal claim. */
public final class IpfsIntegrity {
 private IpfsIntegrity(){}
 public static String check(String uri,byte[] bytes)throws Exception {
  String path=MetadataPolicy.endpoint(uri).substring("https://ipfs.io/ipfs/".length());
  if(path.contains("/")||!path.startsWith("b"))return "not-verified: UnixFS/DAG or path resolution unsupported";
  byte[] cid=base32(path.substring(1));
  if(cid.length<2||cid[0]!=1||cid[1]!=0x55)return "not-verified: only CIDv1 raw codec supported";
  if(cid.length!=36||cid[2]!=0x12||cid[3]!=0x20)throw new IOException("Unsupported raw CID digest; bytes not accepted");
  if(!MessageDigest.isEqual(Arrays.copyOfRange(cid,4,36),MessageDigest.getInstance("SHA-256").digest(bytes)))throw new IOException("IPFS raw content digest mismatch; bytes rejected");
  return "verified: CIDv1 raw sha2-256 bytes (not ownership, safety or authenticity)";
 }
 private static byte[] base32(String value)throws IOException{ByteArrayOutputStream out=new ByteArrayOutputStream();int buffer=0,bits=0;String alphabet="abcdefghijklmnopqrstuvwxyz234567";for(char c:value.toCharArray()){int n=alphabet.indexOf(c);if(n<0)throw new IOException("Invalid CID base32");buffer=(buffer<<5)|n;bits+=5;if(bits>=8){bits-=8;out.write((buffer>>bits)&255);buffer&=(1<<bits)-1;}}if(buffer!=0||value.length()!=(out.size()*8+4)/5)throw new IOException("Noncanonical CID base32");return out.toByteArray();}
}
