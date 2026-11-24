package io.rift.cronos;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import java.security.KeyStore;
import org.json.JSONObject;

/** User-owned credentials only. No secret is returned to WebView or exported with drafts. */
public final class SecureConnections {
    private final SharedPreferences prefs;
    private static final Object LOCK=new Object();
    private static final String ALIAS="rift.connections.v1";
    public SecureConnections(Context context){prefs=context.getSharedPreferences("rift.native.connections",Context.MODE_PRIVATE);}
    private SecretKey key() throws Exception {
        KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
        if(store.containsAlias(ALIAS))return ((KeyStore.SecretKeyEntry)store.getEntry(ALIAS,null)).getSecretKey();
        KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setRandomizedEncryptionRequired(true).build());
        return generator.generateKey();
    }
    private String revisionLocked(){String revision=prefs.getString("readRevision",null);if(revision==null){revision=java.util.UUID.randomUUID().toString();if(!prefs.edit().putString("readRevision",revision).commit())throw new IllegalStateException("Could not initialize read revision");}return revision;}
    public JSONObject load() throws Exception {synchronized(LOCK){
        String value=prefs.getString("encrypted",null);if(value==null)return defaults().put("_readRevision",revisionLocked());
        JSONObject box=new JSONObject(value);Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(box.getString("iv"),Base64.NO_WRAP)));cipher.updateAAD(ALIAS.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        return new JSONObject(new String(cipher.doFinal(Base64.decode(box.getString("data"),Base64.NO_WRAP)),java.nio.charset.StandardCharsets.UTF_8)).put("_readRevision",revisionLocked());
    }
    }
    public void save(JSONObject value) throws Exception {synchronized(LOCK){
        String mode=value.optString("mode","offline");if(!java.util.Arrays.asList("offline","direct","hybrid").contains(mode))throw new IllegalArgumentException("Invalid mode");
        for(String field:new String[]{"rpc","backupRpc"})if(!value.optString(field).isEmpty())NetworkPolicy.endpoint(value.getString(field),false);
        if(!value.optString("cloud").isEmpty())NetworkPolicy.endpoint(value.getString("cloud"),true);
        value.put("gateway",MetadataPolicy.gateway(value.optString("gateway","https://ipfs.io")));
        for(String field:new String[]{"key","backupKey"})if(value.optString(field).length()>8192||value.optString(field).contains("\n")||value.optString(field).contains("\r"))throw new IllegalArgumentException("Invalid credential");
        JSONObject persisted=new JSONObject(value.toString());persisted.remove("_readRevision");
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());cipher.updateAAD(ALIAS.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        JSONObject box=new JSONObject().put("iv",Base64.encodeToString(cipher.getIV(),Base64.NO_WRAP)).put("data",Base64.encodeToString(cipher.doFinal(persisted.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8)),Base64.NO_WRAP));
        if(!prefs.edit().putString("encrypted",box.toString()).putString("readRevision",java.util.UUID.randomUUID().toString()).commit())throw new IllegalStateException("Settings could not be saved");
    }
    }
    /** One-time migration from legacy implicit offline default; explicit disconnects remain paused. */
    public JSONObject startup()throws Exception{synchronized(LOCK){JSONObject value=load();String choice=value.optString("connectionChoice","connected"),nextMode=BackendConnectionPolicy.mode(choice);boolean changed=value.optInt("connectionPolicy",0)!=2||!nextMode.equals(value.optString("mode"))||value.optString("cloud").isEmpty();if(changed){value.put("mode",nextMode).put("connectionChoice",choice).put("connectionPolicy",2);if(value.optString("cloud").isEmpty())value.put("cloud",BackendConnectionPolicy.origin(BuildConfig.RIFT_ORIGIN));save(value);}return load();}}
    public void disconnect()throws Exception{synchronized(LOCK){JSONObject value=load();value.put("mode","offline").put("connectionChoice","paused");save(value);}}
    public void clear(){synchronized(LOCK){try{JSONObject value=defaults().put("mode","offline").put("connectionChoice","paused");save(value);}catch(Exception e){throw new IllegalStateException("Could not reset connections");}}}
    public static JSONObject defaults() throws Exception{return new JSONObject().put("mode","hybrid").put("connectionChoice","connected").put("connectionPolicy",2).put("rpc","https://evm.cronos.org").put("key","").put("backupRpc","").put("backupKey","").put("cloud",BackendConnectionPolicy.origin(BuildConfig.RIFT_ORIGIN)).put("gateway","https://ipfs.io");}
}
