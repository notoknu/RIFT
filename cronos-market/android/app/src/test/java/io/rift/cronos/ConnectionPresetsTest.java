package io.rift.cronos;
import org.junit.Test;import static org.junit.Assert.*;
public final class ConnectionPresetsTest {
 @Test public void publicChoicesHaveValidatedHttpsEndpointsAndManualRemainsEmpty()throws Exception{assertEquals("",ConnectionPresets.rpc(0));assertEquals("",ConnectionPresets.rpc(4));for(int i=1;i<=3;i++){String url=ConnectionPresets.rpc(i);NetworkPolicy.endpoint(url,false);assertFalse(url.contains("?"));assertFalse(url.contains("@"));assertFalse(url.contains("KEY"));}assertEquals(ConnectionPresets.RPC_LABELS.length,5);}
 @Test public void serviceChoicesRequireActualDeploymentNotFakeUrls(){for(int i=0;i<ConnectionPresets.SERVICE_LABELS.length;i++)assertTrue(ConnectionPresets.serviceHelp(i).length()>50);assertTrue(ConnectionPresets.serviceHelp(2).contains("NOT a RIFT API"));}
 @Test public void unknownChoicesFail(){for(int i:new int[]{-1,5,999})try{ConnectionPresets.rpc(i);fail();}catch(IllegalArgumentException expected){}try{ConnectionPresets.serviceHelp(4);fail();}catch(IllegalArgumentException expected){}}
}
