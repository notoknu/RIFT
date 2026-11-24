package io.rift.cronos;
import java.io.*;import java.net.*;import java.nio.charset.StandardCharsets;
public final class NativePolicyHarness {
 private static int assertions;
 private interface Check {void run() throws Exception;}
 private static void require(boolean ok){assertions++;if(!ok)throw new AssertionError("Assertion "+assertions);}
 private static void reject(Check test) throws Exception {assertions++;try{test.run();}catch(Exception expected){return;}throw new AssertionError("Expected rejection "+assertions);}
 private static PinnedHttps.Result response(String value) throws Exception {try(Socket socket=new Socket()){return PinnedHttps.readResponse(new ByteArrayInputStream(value.getBytes(StandardCharsets.US_ASCII)),socket,System.nanoTime()+1000000000L);}}
 public static void main(String[] args) throws Exception {
  for(String value:new String[]{"http://example.com","https://user:pass@example.com","https://127.0.0.1","https://[::1]","https://localhost","https://device.local","https://example.com:444","https://example.com/#x","https://example.com\r\nsecret"})reject(()->NetworkPolicy.endpoint(value,false));
  require(NetworkPolicy.endpoint("https://evm.cronos.org/path?apiKey=private",false).getHost().equals("evm.cronos.org"));require(NetworkPolicy.displayHost("https://evm.cronos.org/path?apiKey=private").equals("evm.cronos.org"));
  reject(()->NetworkPolicy.endpoint("https://example.com/",true));reject(()->NetworkPolicy.endpoint("https://example.com?secret=1",true));require(NetworkPolicy.endpoint("https://example.com",true).getPath().isEmpty());
  for(String address:new String[]{"0.0.0.0","10.1.1.1","127.0.0.1","169.254.169.254","172.16.0.1","192.168.1.1","100.64.0.1","198.18.0.1","192.0.2.1","198.51.100.1","203.0.113.1","224.0.0.1","::1","fc00::1","fe80::1","2001:db8::1","2002::1","2001:0::1","::ffff:127.0.0.1"})require(!NetworkPolicy.publicAddress(InetAddress.getByName(address)));
  for(String address:new String[]{"1.1.1.1","8.8.8.8","2606:4700:4700::1111"})require(NetworkPolicy.publicAddress(InetAddress.getByName(address)));
  String prefix="HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n";
  require(new String(response(prefix+"Content-Length: 2\r\n\r\n{}").body,StandardCharsets.US_ASCII).equals("{}"));
  require(new String(response(prefix+"Transfer-Encoding: chunked\r\n\r\n2;ok=yes\r\n{}\r\n0\r\n\r\n").body,StandardCharsets.US_ASCII).equals("{}"));
  require(response("HTTP/1.1 302 Found\r\nLocation: https://evil.example\r\n\r\n").status==302);
  for(String bad:new String[]{"Content-Length: 2\r\nContent-Length: 2\r\n\r\n{}","Content-Length: 2\r\nTransfer-Encoding: chunked\r\n\r\n{}","Content-Length: 300000\r\n\r\n","Content-Length: 4\r\n\r\n{}","Transfer-Encoding: gzip\r\n\r\n","Content-Encoding: gzip\r\n\r\n","Transfer-Encoding: chunked\r\n\r\nzz\r\n","Transfer-Encoding: chunked\r\n\r\n100000\r\n"," Bad: header\r\n\r\n"})reject(()->response(prefix+bad));
  reject(()->response("HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<html>"));
  reject(()->response(prefix+"\r\n"+"a".repeat(262145)));
  try(Socket socket=new Socket()){reject(()->PinnedHttps.readResponse(new ByteArrayInputStream(new byte[0]),socket,0));}
  String cid="Qm"+"a".repeat(44);require(MetadataPolicy.endpoint("ipfs://"+cid+"/1.json").equals("https://ipfs.io/ipfs/"+cid+"/1.json"));require(MetadataPolicy.endpoint("ipfs://ipfs/"+cid).endsWith(cid));require(MetadataPolicy.endpoint("https://ipfs.io/ipfs/"+cid).endsWith(cid));require(MetadataPolicy.endpoint("ipfs://b"+"a".repeat(58)).startsWith("https://ipfs.io/"));
  for(String bad:new String[]{"https://evil.example/ipfs/"+cid,"https://ipfs.io:443/ipfs/"+cid,"https://user@ipfs.io/ipfs/"+cid,"https://ipfs.io/ipfs/"+cid+"?x=1","https://ipfs.io/ipfs/"+cid+"#x","ipns://example","ipfs://bad","ipfs://"+cid+"/../secret","ipfs://"+cid+"/%2e%2e","ipfs://"+cid+"//a","ipfs://"+cid+"/file?x=y","ipfs://"+cid+"/a\\b","https://127.0.0.1/ipfs/"+cid,"https://ipfs.io.evil.example/ipfs/"+cid,"ipfs://"+cid+"/"+"a".repeat(121)})reject(()->MetadataPolicy.endpoint(bad));
  try(Socket socket=new Socket()){require(PinnedHttps.readResponse(new ByteArrayInputStream((prefix+"Content-Length: 2\r\n\r\n{}").getBytes(StandardCharsets.US_ASCII)),socket,System.nanoTime()+1000000000L,65536).body.length==2);reject(()->PinnedHttps.readResponse(new ByteArrayInputStream((prefix+"Content-Length: 65537\r\n\r\n").getBytes(StandardCharsets.US_ASCII)),socket,System.nanoTime()+1000000000L,65536));reject(()->PinnedHttps.readResponse(new ByteArrayInputStream((prefix+"Transfer-Encoding: chunked\r\n\r\n10001\r\n").getBytes(StandardCharsets.US_ASCII)),socket,System.nanoTime()+1000000000L,65536));}
  System.out.println("Native policy/parser assertions passed: "+assertions+". No Android device, Keystore or live provider claimed.");
 }
}
