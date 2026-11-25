package io.rift.cronos;

import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.security.KeyStore;
import java.util.UUID;
import javax.crypto.AEADBadTagException;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import static org.junit.Assert.*;

/** Isolated AndroidKeyStore API tests. Never accesses WalletVault's real alias,
 * preferences, seed or authentication window. No network/transactions.
 * These do NOT establish device-credential/biometric vault acceptance. */
@RunWith(AndroidJUnit4.class)
public final class KeystoreInstrumentedTest {
 private String alias;
 @Before public void before(){alias="rift.test.keystore."+UUID.randomUUID();}
 @After public void after()throws Exception{KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);if(store.containsAlias(alias))store.deleteEntry(alias);}
 private SecretKey create()throws Exception{
  KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
  generator.init(new KeyGenParameterSpec.Builder(alias,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setRandomizedEncryptionRequired(true).build());
  return generator.generateKey();
 }
 @Test public void isolatedKeyIsNonExportableAndSurvivesReload()throws Exception{
  SecretKey key=create();assertNull(key.getEncoded());
  Cipher enc=Cipher.getInstance("AES/GCM/NoPadding");enc.init(Cipher.ENCRYPT_MODE,key);enc.updateAAD(new byte[]{1,2});byte[] boxed=enc.doFinal(new byte[]{3,4,5});
  KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);SecretKey reopened=(SecretKey)store.getKey(alias,null);assertNull(reopened.getEncoded());
  Cipher dec=Cipher.getInstance("AES/GCM/NoPadding");dec.init(Cipher.DECRYPT_MODE,reopened,new GCMParameterSpec(128,enc.getIV()));dec.updateAAD(new byte[]{1,2});assertArrayEquals(new byte[]{3,4,5},dec.doFinal(boxed));
 }
 @Test public void authenticatedEncryptionRejectsChangedCiphertextAndAad()throws Exception{
  SecretKey key=create();Cipher enc=Cipher.getInstance("AES/GCM/NoPadding");enc.init(Cipher.ENCRYPT_MODE,key);enc.updateAAD(new byte[]{9});byte[] boxed=enc.doFinal(new byte[]{7,8});
  for(boolean tamper:new boolean[]{true,false}){
   byte[] input=boxed.clone();if(tamper)input[0]^=1;
   Cipher dec=Cipher.getInstance("AES/GCM/NoPadding");dec.init(Cipher.DECRYPT_MODE,key,new GCMParameterSpec(128,enc.getIV()));dec.updateAAD(new byte[]{(byte)(tamper?9:10)});
   try{dec.doFinal(input);fail("Tampered ciphertext/AAD accepted");}catch(AEADBadTagException expected){}
  }
 }
 @Test public void encryptionUsesFreshIvs()throws Exception{
  SecretKey key=create();Cipher first=Cipher.getInstance("AES/GCM/NoPadding");first.init(Cipher.ENCRYPT_MODE,key);first.doFinal(new byte[]{1});Cipher second=Cipher.getInstance("AES/GCM/NoPadding");second.init(Cipher.ENCRYPT_MODE,key);second.doFinal(new byte[]{1});assertFalse(java.util.Arrays.equals(first.getIV(),second.getIV()));
 }
 @Test public void deletedTestAliasIsNotSilentlyRecreated()throws Exception{
  create();KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);assertTrue(store.containsAlias(alias));store.deleteEntry(alias);assertFalse(store.containsAlias(alias));assertNull(store.getKey(alias,null));
 }
}
