package io.rift.cronos;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Bundle;
import android.view.View;
import android.webkit.*;
import android.widget.*;
import java.io.*;
import java.util.*;

/** Bundled frontend at the configured HTTPS origin. APIs use ordinary same-origin
 * networking and cookies; native settings/tools are separate Activities. The scoped channels expose user-confirmed file exports, consented personal data and narrow known-asset read operations; never credentials, arbitrary RPC or signing. */
public final class MainActivity extends Activity {
    private WebView web;private volatile RequestControl startupControl;private volatile boolean connectionActive;private TextView connectionLabel;
    private NativeExports exports;
    private NativeInputs inputs;
    private NativeWorkspace workspace;
    private NativeReads reads;
    private Bundle restoreWeb;
    private final Set<String> assets = new HashSet<>();
    private boolean configured;
    private String origin="https://rift.invalid", mode="offline";
    private static final int CONNECTIONS=72;
    private boolean showingApp;
    private static final Set<String> ROUTES = new HashSet<>(Arrays.asList("", "discover", "collections", "market", "account", "trade", "collection", "assets", "profile", "launch", "launchpad", "create", "creator", "portfolio", "explore", "marketplace", "activity", "about", "search", "favorites", "settings"));

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE);
        getWindow().setStatusBarColor(Color.rgb(9,11,18));
        getWindow().setNavigationBarColor(Color.rgb(9,11,18));
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(getAssets().open("web-files.txt"), "UTF-8"))) {
            String line; while ((line=reader.readLine())!=null) assets.add(line);
        } catch (IOException ignored) { showMessage("App assets missing", "Rebuild the Android package from the included source."); return; }
        try {org.json.JSONObject settings=new SecureConnections(this).startup();mode=settings.optString("mode","offline");String cloud=settings.optString("cloud",BuildConfig.RIFT_ORIGIN);if(cloud.isEmpty())cloud=BuildConfig.RIFT_ORIGIN;configured=mode.equals("hybrid")&&!cloud.isEmpty();if(configured){NetworkPolicy.endpoint(cloud,true);origin=cloud;}}catch(Exception e){configured=false;mode="offline";}
        boolean restore=state!=null&&origin.equals(state.getString("webOrigin"))&&mode.equals(state.getString("webMode"))&&state.getBoolean("showingApp");
        if(restore)restoreWeb=state.getBundle("webState");
        if (configured||restore) openApp(); else showSetup();
    }
    private int dp(int n) { return (int)(getResources().getDisplayMetrics().density*n); }
    private void showSetup() {
        showingApp=false;
        disposeWeb();
        LinearLayout box=new LinearLayout(this);box.setOrientation(LinearLayout.VERTICAL);box.setPadding(dp(28),dp(72),dp(28),dp(28));box.setBackgroundColor(Color.rgb(9,11,18));
        TextView logo=new TextView(this);logo.setText(R.string.app_name);logo.setTextSize(46);logo.setTextColor(Color.rgb(184,255,67));box.addView(logo);
        TextView text=new TextView(this);text.setText("RIFT · RENDER CONNECTED APP\n\nConnection is paused or protected settings could not be loaded.\n\nOpen Advanced settings, then Connect saved services to resume. Your wallet and personal data are unchanged. The app does not switch to another operating mode or invent balances when the backend is unavailable.");text.setTextColor(Color.rgb(212,216,228));text.setTextSize(16);text.setPadding(0,dp(24),0,dp(24));box.addView(text);
        Button connections=new Button(this);connections.setText(R.string.connections_tools);connections.setOnClickListener(v->openConnections());box.addView(connections);
        ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);scroll.addView(box);setContentView(scroll);
    }
    private void openApp() {
        disposeWeb();showingApp=true;connectionActive=true;web=new WebView(this);web.setBackgroundColor(Color.rgb(9,11,18));
        WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setSafeBrowsingEnabled(true);settings.setMediaPlaybackRequiresUserGesture(true);settings.setJavaScriptCanOpenWindowsAutomatically(false);settings.setSupportMultipleWindows(false);settings.setUserAgentString(settings.getUserAgentString()+" RIFTAndroid/21");
        CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        inputs=new NativeInputs(this);exports=new NativeExports(this,origin);exports.install(web);workspace=new NativeWorkspace(this,origin);workspace.install(web);reads=new NativeReads(this,origin);reads.install(web);
        web.setWebChromeClient(new WebChromeClient(){
            @Override public void onPermissionRequest(PermissionRequest request){request.deny();}
            @Override public boolean onShowFileChooser(WebView view,android.webkit.ValueCallback<Uri[]> callback,FileChooserParams params){if(!trustedPage()){callback.onReceiveValue(null);return true;}return inputs.choose(callback,params);}
        });
        web.setWebViewClient(new WebViewClient(){
            @Override public void onPageStarted(WebView view,String url,android.graphics.Bitmap icon){if(view!=web)return;if(exports!=null)exports.navigation();if(inputs!=null)inputs.navigation();if(workspace!=null)workspace.navigation();if(reads!=null)reads.navigation();}
            @Override public boolean onRenderProcessGone(WebView view,RenderProcessGoneDetail detail){disposeWeb();showSetup();Toast.makeText(MainActivity.this,"Web renderer stopped. Reopen the interface; check saved transaction status before retrying any wallet action.",Toast.LENGTH_LONG).show();return true;}
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
                Uri uri=request.getUrl();
                if (sameOrigin(uri)) {
                    String path=uri.getPath()==null?"/":uri.getPath();
                    if(path.startsWith("/api/")||path.equals("/healthz")) return configured?null:unavailable();
                    if(!"GET".equals(request.getMethod()))return unavailable();
                    String file=path.equals("/")?"index.html":path.substring(1);
                    if(file.contains("..")||file.contains("\\")||file.indexOf('\0')>=0)return unavailable();
                    if(assets.contains(file))return asset(file);
                    String section=file.split("/",2)[0];
                    if(request.isForMainFrame()&&ROUTES.contains(section))return asset("index.html");
                    return configured?null:unavailable();
                }
                return configured?null:unavailable();
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
                if(sameOrigin(request.getUrl()))return false;
                if(request.isForMainFrame()&&request.hasGesture())openExternal(request.getUrl());
                return true;
            }
            @Override public void onReceivedSslError(WebView view,SslErrorHandler handler,SslError error){handler.cancel();}
            @Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceError error){if(request.isForMainFrame())Toast.makeText(MainActivity.this,"Unable to open this page. Check your connection.",Toast.LENGTH_LONG).show();}
        });
        web.setDownloadListener((url,ua,disposition,mime,length)->{if(configured&&url.startsWith("https://"))new AlertDialog.Builder(this).setTitle("Open download in browser?").setMessage("The external browser will handle this download. Its session may differ from the app.").setPositiveButton("Open",(d,w)->openExternal(Uri.parse(url))).setNegativeButton("Cancel",null).show();else Toast.makeText(this,"Use an integrated Save/Export button. Large files or unsupported WebViews require the website.",Toast.LENGTH_LONG).show();});
        LinearLayout container=new LinearLayout(this);container.setOrientation(LinearLayout.VERTICAL);container.setBackgroundColor(Color.rgb(9,11,18));
        if(BuildConfig.DEBUG){TextView notice=new TextView(this);notice.setText(R.string.preview_notice);notice.setTextColor(Color.rgb(184,255,67));notice.setTextSize(11);notice.setPadding(dp(12),dp(8),dp(12),dp(8));container.addView(notice);}
        Button connections=new Button(this);connections.setText(R.string.connections_tools);connections.setOnClickListener(v->openConnections());container.addView(connections);
        TextView status=new TextView(this);status.setTextColor(Color.WHITE);status.setPadding(dp(12),dp(6),dp(12),dp(6));status.setText(R.string.backend_connecting);container.addView(status);
        connectionLabel=status;
        Button retry=new Button(this);retry.setText(R.string.backend_retry);retry.setOnClickListener(v->{probeConnection();if(web!=null)web.reload();});container.addView(retry);
        container.addView(web,new LinearLayout.LayoutParams(-1,0,1));setContentView(container);
        View root=container;root.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});
        if(restoreWeb==null||web.restoreState(restoreWeb)==null)web.loadUrl(origin+"/");restoreWeb=null;
    }
    private void probeConnection(){
        if(startupControl!=null)startupControl.close();final TextView label=connectionLabel;if(label==null)return;final String expectedOrigin=origin;label.setText(R.string.backend_connecting);
        Thread probe=new Thread(()->{String message;try(RequestControl control=new RequestControl(20000)){
            startupControl=control;if(!connectionActive)throw new IllegalStateException();
            org.json.JSONObject current=new SecureConnections(this).load();if(!current.optString("connectionChoice").equals("connected"))throw new IllegalStateException();
            PinnedHttps.Result result=PinnedHttps.health(expectedOrigin,control);if(result.status!=200)throw new IllegalStateException();
            org.json.JSONObject health=new org.json.JSONObject(JsonBudget.check(new String(result.body,java.nio.charset.StandardCharsets.UTF_8),65536,12));
            if(!health.optString("status").equals("ok")||health.optInt("chainId",-1)!=25)throw new IllegalStateException();
            if(!current.getString("_readRevision").equals(new SecureConnections(this).load().getString("_readRevision")))throw new IllegalStateException();
            message=getString(R.string.backend_connected);
        }catch(Exception e){message=getString(R.string.backend_unavailable);}
        final String result=message;runOnUiThread(()->{if(!isDestroyed()&&connectionActive&&origin.equals(expectedOrigin)&&connectionLabel==label)label.setText(result);});},"rift-backend-check");probe.setDaemon(true);probe.start();
    }
    @Override protected void onResume(){super.onResume();connectionActive=true;if(connectionLabel!=null&&!mode.equals("offline"))probeConnection();}
    private void openConnections(){connectionActive=false;if(startupControl!=null)startupControl.close();disposeWeb();startActivityForResult(new Intent(this,HybridActivity.class),CONNECTIONS);}
    @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request==CONNECTIONS)recreate();else if(request==NativeExports.PICK_DESTINATION&&exports!=null)exports.onResult(result,data);else if(request==NativeInputs.PICK_FILES&&inputs!=null)inputs.onResult(result,data);}
    private boolean trustedPage(){try{return web!=null&&web.getUrl()!=null&&sameOrigin(Uri.parse(web.getUrl()));}catch(Exception e){return false;}}
    private void disposeWeb(){connectionLabel=null;if(reads!=null){reads.close();reads=null;}if(workspace!=null){workspace.close();workspace=null;}if(exports!=null){exports.close();exports=null;}if(inputs!=null){inputs.close();inputs=null;}if(web!=null){if(web.getParent() instanceof android.view.ViewGroup)((android.view.ViewGroup)web.getParent()).removeView(web);web.destroy();web=null;}}
    @Override protected void onSaveInstanceState(Bundle state){super.onSaveInstanceState(state);state.putString("webOrigin",origin);state.putString("webMode",mode);state.putBoolean("showingApp",showingApp);if(web!=null){Bundle saved=new Bundle();web.saveState(saved);state.putBundle("webState",saved);}}
    private boolean sameOrigin(Uri uri){Uri base=Uri.parse(origin);int port=uri.getPort();return "https".equals(uri.getScheme())&&base.getHost()!=null&&base.getHost().equalsIgnoreCase(uri.getHost())&&(port==-1||port==443)&&uri.getUserInfo()==null;}
    private WebResourceResponse asset(String file){try{String mime=file.endsWith(".js")?"application/javascript":file.endsWith(".css")?"text/css":file.endsWith(".svg")?"image/svg+xml":file.endsWith(".png")?"image/png":file.endsWith(".jpg")||file.endsWith(".jpeg")?"image/jpeg":file.endsWith(".webp")?"image/webp":file.endsWith(".json")?"application/json":file.endsWith(".woff2")?"font/woff2":file.endsWith(".html")?"text/html":"application/octet-stream";Map<String,String> headers=new HashMap<>();headers.put("X-Content-Type-Options","nosniff");headers.put("Cache-Control","no-cache");headers.put("Referrer-Policy","no-referrer");if(configured)headers.put("Content-Security-Policy","default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https: wss:; frame-src https://verify.walletconnect.com https://verify.walletconnect.org; worker-src 'self' blob:; object-src 'none'; base-uri 'none'");if(!configured)headers.put("Content-Security-Policy","default-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'");return new WebResourceResponse(mime,"UTF-8",200,"OK",headers,getAssets().open("web/"+file));}catch(IOException e){return unavailable();}}
    private WebResourceResponse unavailable(){return new WebResourceResponse("application/json","UTF-8",503,"Service unavailable",Collections.singletonMap("Cache-Control","no-store"),new ByteArrayInputStream("{\"error\":\"Shared API unavailable or disconnected. Configure and connect your compatible service; native Cronos tools are separate.\"}".getBytes(java.nio.charset.StandardCharsets.UTF_8)));}
    private void openExternal(Uri uri){if(!configured){Toast.makeText(this,"External connections are disabled in the offline preview.",Toast.LENGTH_SHORT).show();return;}String scheme=uri.getScheme();if(!Arrays.asList("https","wc","metamask","trust","rainbow","cryptocom").contains(scheme)){Toast.makeText(this,"Unsupported external link",Toast.LENGTH_SHORT).show();return;}try{Intent intent=new Intent(Intent.ACTION_VIEW,uri);intent.addCategory(Intent.CATEGORY_BROWSABLE);startActivity(intent);}catch(Exception e){Toast.makeText(this,"No compatible app installed",Toast.LENGTH_LONG).show();}}
    private void showMessage(String title,String message){new AlertDialog.Builder(this).setTitle(title).setMessage(message).setPositiveButton("Close",(d,w)->finish()).show();}
    @Override public void onBackPressed(){if(web!=null&&web.canGoBack())web.goBack();else if(showingApp&&!configured)showSetup();else super.onBackPressed();}
    @Override protected void onStop(){connectionActive=false;if(startupControl!=null)startupControl.close();if(reads!=null)reads.navigation();super.onStop();}
    @Override protected void onDestroy(){disposeWeb();super.onDestroy();}
}
