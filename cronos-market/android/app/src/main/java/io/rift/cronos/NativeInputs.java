package io.rift.cronos;
import android.app.*;import android.content.*;import android.database.Cursor;import android.net.Uri;import android.provider.OpenableColumns;import android.webkit.*;import android.widget.Toast;
import androidx.core.content.FileProvider;
import java.io.*;import java.util.*;import java.util.concurrent.*;

/** User-selected data files are copied into a bounded private staging directory.
 * No camera, broad storage permission, persisted provider grant or arbitrary path API. */
public final class NativeInputs implements AutoCloseable {
 public static final int PICK_FILES=95;
 private final Activity activity;private final ExecutorService io=Executors.newSingleThreadExecutor();private State pending,picker;private boolean closed;private long retainedBytes;private int retainedFiles;private final String instance=UUID.randomUUID().toString();
 private static final class State {final ValueCallback<Uri[]> callback;final Set<String> types;final boolean multiple;volatile boolean cancelled;AlertDialog consent;State(ValueCallback<Uri[]> callback,Set<String> types,boolean multiple){this.callback=callback;this.types=types;this.multiple=multiple;}}
 public NativeInputs(Activity activity){this.activity=activity;}
 public boolean choose(ValueCallback<Uri[]> callback,WebChromeClient.FileChooserParams params){
  if(closed||pending!=null||picker!=null){callback.onReceiveValue(null);return true;}
  Set<String> types=new HashSet<>();try{for(String raw:params.getAcceptTypes()){if(raw==null)continue;for(String part:raw.split(",")){String t=part.trim().toLowerCase(Locale.ROOT);if(t.isEmpty()||t.equals("*/*"))continue;if(!FilePolicy.allowedAccept(t))throw new IllegalArgumentException();types.add(t.startsWith(".")?FilePolicy.mime("file"+t):t);}}}catch(Exception e){callback.onReceiveValue(null);Toast.makeText(activity,"This preview supports data/image documents only.",Toast.LENGTH_LONG).show();return true;}
  State s=new State(callback,types,params.getMode()==WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE);pending=s;
  s.consent=new AlertDialog.Builder(activity).setTitle("Choose files for this page?").setMessage("Only select files you intend to give the requesting page. Up to 128 files, 25 MiB each and 128 MiB total per interface session (including earlier selections). No automatic upload is performed by Android; a web page can use files you select. Never select wallet secrets or credentials.").setPositiveButton("Choose files",(d,w)->{if(pending!=s)return;Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("*/*");if(!types.isEmpty())intent.putExtra(Intent.EXTRA_MIME_TYPES,types.toArray(new String[0]));intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,s.multiple);picker=s;try{activity.startActivityForResult(intent,PICK_FILES);}catch(Exception e){picker=null;stop(s);}}).setNegativeButton("Cancel",(d,w)->stop(s)).setOnCancelListener(d->stop(s)).show();return true;
 }
 public void onResult(int code,Intent data){State s=picker;picker=null;if(s==null)return;if(pending!=s||s.cancelled||code!=Activity.RESULT_OK||data==null){stop(s);return;}
  ArrayList<Uri> selected=new ArrayList<>();if(data.getClipData()!=null){ClipData clip=data.getClipData();for(int i=0;i<clip.getItemCount();i++)selected.add(clip.getItemAt(i).getUri());}else if(data.getData()!=null)selected.add(data.getData());
  if(selected.isEmpty()||selected.size()>FilePolicy.IMPORT_COUNT_MAX||!s.multiple&&selected.size()!=1){stop(s);return;}
  io.execute(()->{File batch=null;try{if(s.cancelled)throw new IOException();File root=new File(activity.getCacheDir(),"imports/"+instance);if(!root.exists()&&!root.mkdirs())throw new IOException();batch=new File(root,UUID.randomUUID().toString());if(!batch.mkdir())throw new IOException();ArrayList<Uri> result=new ArrayList<>();Set<String> names=new HashSet<>();long total=0;
   for(Uri uri:selected){if(s.cancelled||uri==null||!"content".equals(uri.getScheme()))throw new IOException();String name=null;try(Cursor cursor=activity.getContentResolver().query(uri,new String[]{OpenableColumns.DISPLAY_NAME},null,null,null)){if(cursor!=null&&cursor.moveToFirst())name=cursor.getString(0);}name=FilePolicy.filename(name);if(!names.add(name)||!s.types.isEmpty()&&!s.types.contains(FilePolicy.mime(name))&&!(s.types.contains("image/*")&&FilePolicy.mime(name).startsWith("image/")))throw new IOException();File file=new File(batch,name);long count=0;
    try(InputStream input=activity.getContentResolver().openInputStream(uri);OutputStream output=new FileOutputStream(file)){if(input==null)throw new IOException();byte[] buffer=new byte[8192];int n;while((n=input.read(buffer))!=-1){if(s.cancelled)throw new IOException();count+=n;total+=n;if(count>FilePolicy.IMPORT_FILE_MAX||total+retainedBytes>FilePolicy.IMPORT_TOTAL_MAX||selected.size()+retainedFiles>FilePolicy.IMPORT_COUNT_MAX)throw new IOException();output.write(buffer,0,n);}}
    result.add(FileProvider.getUriForFile(activity,activity.getPackageName()+".files",file));
   }
   retainedBytes+=total;retainedFiles+=selected.size();final File done=batch;activity.runOnUiThread(()->{if(pending==s&&!s.cancelled&&!closed){pending=null;s.callback.onReceiveValue(result.toArray(new Uri[0]));}else{remove(done);stop(s);}});
  }catch(Exception e){if(batch!=null)remove(batch);activity.runOnUiThread(()->{stop(s);if(!closed)Toast.makeText(activity,"Selection rejected: unsupported name/type, duplicate file, size limit, provider error or cancelled page.",Toast.LENGTH_LONG).show();});}});
 }
 private void stop(State s){if(s==null)return;s.cancelled=true;if(s.consent!=null){s.consent.dismiss();s.consent=null;}if(pending==s){pending=null;s.callback.onReceiveValue(null);}}
 private static void remove(File file){File[] children=file.listFiles();if(children!=null)for(File child:children)remove(child);file.delete();}
 public void navigation(){stop(pending);}
 @Override public void close(){if(closed)return;closed=true;navigation();io.execute(()->remove(new File(activity.getCacheDir(),"imports/"+instance)));io.shutdown();}
}
