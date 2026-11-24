package io.rift.cronos;

import android.app.*;import android.os.*;import android.webkit.WebView;
import androidx.webkit.*;import org.json.*;import java.util.*;import java.util.concurrent.*;

/** Opt-in personal workspace ONLY. No credentials, chain RPC, file path, clear-all or signing API.
 * Access is granted per opened page/profile, not as wallet authentication. All DB access is serialized. */
public final class NativeWorkspace implements AutoCloseable {
 private final Activity activity;private final String origin;private final LocalWorkspace store;
 private final Handler ui=new Handler(Looper.getMainLooper());private final ExecutorService io=Executors.newSingleThreadExecutor();
 private final Set<String> granted=new HashSet<>();private Request pending;private boolean closed;private long epoch;
 private AlertDialog consent;
 private static final class Request {final String id,op,account;final JSONObject data;final JavaScriptReplyProxy reply;final long epoch;volatile boolean cancelled;Runnable timeout;
  Request(String id,String op,String account,JSONObject data,JavaScriptReplyProxy reply,long epoch){this.id=id;this.op=op;this.account=account;this.data=data;this.reply=reply;this.epoch=epoch;}}
 public NativeWorkspace(Activity activity,String origin){this.activity=activity;this.origin=origin;store=new LocalWorkspace(activity);}
 public boolean install(WebView web){if(!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER))return false;
  WebViewCompat.addWebMessageListener(web,"RiftLocal",Collections.singleton(origin),(view,message,source,isMain,reply)->{
   if(closed||!isMain||!FilePolicy.sameOrigin(origin,source.toString()))return;String id="";
   try{String raw=message.getData();JsonBudget.check(raw,WorkspacePolicy.MESSAGE_MAX,32);JSONObject data=new JSONObject(raw);id=WorkspacePolicy.id(data.getString("id"));
    if("cancel".equals(data.optString("op"))){if(pending!=null&&pending.id.equals(id))cancel("Request cancelled. A started database mutation may already have committed; reload before retrying.");return;}
    String op=WorkspacePolicy.operation(data.getString("op")),account=WorkspacePolicy.account(data.getString("account"));
    if(pending!=null){reply(reply,id,null,"Personal workspace is busy");return;}
    Request r=new Request(id,op,account,data,reply,epoch);pending=r;r.timeout=()->{if(pending==r)cancel("Personal workspace request timed out. Reload before retrying a mutation.");};ui.postDelayed(r.timeout,85000);
    if(granted.contains(account))execute(r);else consent=new AlertDialog.Builder(activity).setTitle("Allow personal workspace access?")
     .setMessage("The RIFT page at "+origin+" requests access to native drafts and favorites for "+account+".\n\nAllowing lets this page read, add, import and delete drafts in this profile for this opened document, including in-app route changes, until a full navigation/reload or closure. Profile selection does not prove wallet ownership. No connection credentials, wallet keys or signing are exposed. Only allow an origin you trust.")
     .setPositiveButton("Allow this profile",(d,w)->{consent=null;if(pending==r&&!r.cancelled){granted.add(account);execute(r);}})
     .setNegativeButton("Deny",(d,w)->{consent=null;if(pending==r)cancel("Native workspace access denied; no browser fallback was used");})
     .setOnCancelListener(d->{consent=null;if(pending==r)cancel("Native workspace access denied");}).show();
   }catch(Exception e){reply(reply,id,null,"Personal workspace request rejected");}
  });return true;
 }
 private void execute(Request r){io.execute(()->{Object result=null;String error=null;try{if(r.cancelled)throw new IllegalStateException();
   switch(r.op){
    case "list":result=new JSONObject().put("account",r.account).put("drafts",store.drafts(r.account)).put("favorites",store.favorites(r.account));break;
    case "export":result=store.backup(r.account);break;
    case "save":if(!(r.data.get("title") instanceof String))throw new IllegalArgumentException();String id=store.save(r.account,r.data.getString("title"),r.data.getJSONObject("document"));JSONArray drafts=store.drafts(r.account);for(int i=0;i<drafts.length();i++)if(id.equals(drafts.getJSONObject(i).getString("id"))){result=drafts.getJSONObject(i);break;}break;
    case "remove":store.delete(r.account,WorkspacePolicy.id(r.data.getString("draftId")));result=JSONObject.NULL;break;
    case "import":result=store.restore(r.account,r.data.getJSONObject("backup"));break;
    default:throw new IllegalArgumentException();
   }
  }catch(IllegalArgumentException e){error="Personal workspace validation failed; check titles, document size, credentials, chain and profile";}
  catch(Exception e){error="Personal workspace operation failed; check limits and backup format. Reload before retrying.";}
  final Object value=result;final String failure=error;ui.post(()->{if(pending==r&&!r.cancelled&&!closed&&r.epoch==epoch){pending=null;ui.removeCallbacks(r.timeout);reply(r.reply,r.id,value,failure);}});
 });}
 private void reply(JavaScriptReplyProxy proxy,String id,Object value,String error){try{JSONObject data=new JSONObject().put("id",id).put("ok",error==null);if(error==null)data.put("result",value==null?JSONObject.NULL:value);else data.put("error",error);String raw=data.toString();if(raw.length()>WorkspacePolicy.MESSAGE_MAX)raw=new JSONObject().put("id",id).put("ok",false).put("error","Workspace response exceeds 4 MiB").toString();if(WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER))proxy.postMessage(raw);}catch(Exception ignored){}}
 private void cancel(String error){Request r=pending;if(r==null)return;pending=null;r.cancelled=true;ui.removeCallbacks(r.timeout);if(consent!=null){consent.dismiss();consent=null;}reply(r.reply,r.id,null,error);}
 public void navigation(){epoch++;granted.clear();cancel("Page changed. Reload workspace before retrying; a started mutation may already have committed.");}
 @Override public void close(){if(closed)return;closed=true;navigation();io.execute(store::close);io.shutdown();}
}
