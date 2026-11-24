package io.rift.cronos;
import android.content.Context;import androidx.work.*;import org.json.*;
/** Best-effort periodic receipt observations, max 3 targets / 30s per target per invocation.
 * No signing/broadcast, no backup forwarding, no continuously running service. */
public final class ReceiptWatchWorker extends Worker {
 private volatile RequestControl active;
 public ReceiptWatchWorker(Context context,WorkerParameters params){super(context,params);}
 @Override public Result doWork(){Context context=getApplicationContext();String generation=ReceiptWatchScheduler.generation(context);if(!ReceiptWatchScheduler.enabled(context)||isStopped())return Result.success();ReceiptWatchStore store=new ReceiptWatchStore(context);
  try{store.expire(System.currentTimeMillis());if(store.active()==0){ReceiptWatchScheduler.pauseIfUnchanged(context,generation);return Result.success();}
   for(int i=0;i<3&&!isStopped();i++){
    if(!ReceiptWatchScheduler.enabled(context)||!generation.equals(ReceiptWatchScheduler.generation(context)))break;
    JSONObject settings=new SecureConnections(context).load();if(settings.optString("mode","offline").equals("offline")){ReceiptWatchScheduler.pauseIfUnchanged(context,generation);break;}
    JSONObject claim=store.claim(System.currentTimeMillis());if(claim==null)break;
    try(RequestControl control=new RequestControl(30000)){active=control;if(isStopped())break;ReadOnlyRpc client=new ReadOnlyRpc(settings.getString("rpc"),settings.optString("key"),control);JSONObject report=client.receipt(claim.getString("hash")).put("chainId",25).put("checkedAt",System.currentTimeMillis()).put("sourceHost",NetworkPolicy.displayHost(settings.getString("rpc"))).put("cached",true).put("backgroundObservation",true);
     if(isStopped()||!ReceiptWatchScheduler.enabled(context)||!generation.equals(ReceiptWatchScheduler.generation(context)))break;boolean included=report.optString("state").startsWith("included-");store.complete(claim,report,included?"observed-inclusion":"watching",included?"RPC-reported inclusion observed. Monitoring stopped; this is NOT finality. Recheck manually before dependent actions.":"No receipt observed; check deferred. No transaction was sent.",System.currentTimeMillis(),false);
    }catch(Exception e){if(isStopped()||!ReceiptWatchScheduler.enabled(context)||!generation.equals(ReceiptWatchScheduler.generation(context)))break;boolean attention=e instanceof ReadOnlyRpc.ProviderFailure&&e.getMessage().startsWith("Provider authentication")||e instanceof IllegalStateException&&e.getMessage()!=null&&e.getMessage().startsWith("Wrong chain");store.complete(claim,new JSONObject(),attention?"needs-attention":"watching",attention?"Saved provider rejected authentication or chain 25. Fix settings and explicitly restart this watch.":"Provider read failed or timed out. Deferred with bounded backoff; no transaction was sent.",System.currentTimeMillis(),true);}finally{active=null;}
   }
   if(store.active()==0)ReceiptWatchScheduler.pauseIfUnchanged(context,generation);return Result.success();
  }catch(Exception e){ReceiptWatchScheduler.pauseIfUnchanged(context,generation);return Result.failure();}finally{if(active!=null)active.close();active=null;store.close();}
 }
 @Override public void onStopped(){RequestControl control=active;if(control!=null)control.close();super.onStopped();}
}
