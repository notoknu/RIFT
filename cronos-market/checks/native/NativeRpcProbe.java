package io.rift.cronos;
import java.nio.charset.StandardCharsets;
/** Optional public read-only probe. No key, wallet or transaction methods. */
public final class NativeRpcProbe {
 public static void main(String[] args) throws Exception {
  String endpoint="https://evm.cronos.org";
  PinnedHttps.Result result=PinnedHttps.post(endpoint,"","{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_chainId\",\"params\":[]}".getBytes(StandardCharsets.UTF_8));
  String body=new String(result.body,StandardCharsets.UTF_8);if(result.status!=200||!body.matches("(?s).*\\\"result\\\"\\s*:\\s*\\\"0x19\\\".*"))throw new IllegalStateException("Public Cronos chain probe failed");
  System.out.println("Pinned TLS public read-only transport probe passed: evm.cronos.org chainId 25. JVM only, not Android device acceptance.");
 }
}
