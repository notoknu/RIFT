package io.rift.cronos;
import org.junit.Test;import static org.junit.Assert.*;
public final class BackendConnectionPolicyTest {
 @Test public void defaultBackendIsRender(){assertEquals("https://rift-q6qs.onrender.com",BackendConnectionPolicy.origin(""));assertEquals(BackendConnectionPolicy.DEFAULT_ORIGIN,BackendConnectionPolicy.origin(null));}
 @Test public void advancedConfiguredOriginIsPreserved(){assertEquals("https://api.example",BackendConnectionPolicy.origin("https://api.example"));}
 @Test public void connectedAndLegacyChoicesHaveOnlyOneOnlineMode(){assertEquals("hybrid",BackendConnectionPolicy.mode("connected"));assertEquals("hybrid",BackendConnectionPolicy.mode(""));}
 @Test public void explicitPauseNeverSilentlyReconnects(){assertEquals("offline",BackendConnectionPolicy.mode("paused"));}
}
