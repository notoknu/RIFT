package io.rift.cronos;
import android.app.Application;import java.io.File;import java.util.List;
public final class RiftApplication extends Application {
 @Override public void onCreate(){super.onCreate();File cache=getCacheDir();List<File> stale=StagingCleanup.snapshot(cache);Thread cleanup=new Thread(()->StagingCleanup.remove(cache,stale),"rift-old-staging-cleanup");cleanup.setDaemon(true);cleanup.start();}
}
