package io.rift.cronos;
import org.junit.Test;import static org.junit.Assert.*;
public final class MetadataGatewayTest {
 private static final String CID="Qm"+"a".repeat(44);
 @Test public void gatewayIsOnlyOriginNotArbitraryRequest()throws Exception{assertEquals("https://dweb.link/ipfs/"+CID+"/1.json",MetadataPolicy.requestEndpoint("ipfs://"+CID+"/1.json","https://dweb.link"));assertEquals("https://my-gateway.example",MetadataPolicy.gateway("https://my-gateway.example"));}
 @Test public void credentialsPortsPathsQueriesLocalAndAlternateSchemesAreRejected()throws Exception{for(String v:new String[]{"http://ipfs.io","https://IPFS.IO","https://ipfs.io/","https://ipfs.io:443","https://user@ipfs.io","https://ipfs.io?key=1","https://ipfs.io#x","https://localhost","https://127.0.0.1","https://[::1]","https://foo.local","https://ipfs.io/ipfs","https://ipfs.io\\@evil.example","https://ipfs.io\n"})try{MetadataPolicy.gateway(v);fail(v);}catch(Exception expected){}}
 @Test public void pageCannotOverrideSavedGatewayOrChooseArbitraryPath()throws Exception{for(String ref:new String[]{"https://evil.example/private","ipfs://"+CID+"/../secrets","ipfs://"+CID+"/%2fsecret","ipfs://"+CID+"?secret=1"})try{MetadataPolicy.requestEndpoint(ref,"https://dweb.link");fail(ref);}catch(IllegalArgumentException expected){}}
 @Test public void canonicalReferenceRemainsIndependentOfGateway()throws Exception{String canonical=MetadataPolicy.endpoint("ipfs://"+CID);assertEquals("https://ipfs.io/ipfs/"+CID,canonical);assertEquals("https://custom.example/ipfs/"+CID,MetadataPolicy.requestEndpoint(canonical,"https://custom.example"));}
}
