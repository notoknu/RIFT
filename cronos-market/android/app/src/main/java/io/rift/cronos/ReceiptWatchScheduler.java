package io.rift.cronos;
import android.content.*;import androidx.work.*;import java.util.*;import java.util.concurrent.*;
/** Explicitly opt-in unique WorkManager job. Inputs contain no provider credentials or target data. */
public final class ReceiptWatchScheduler {
 private static final String NAME="rift-known-receipt-observations";private ReceiptWatchScheduler(){}
 private static android.content.SharedPreferences prefs(Context c){return c.getSharedPreferences("rift.receipt-scheduler",Context.MODE_PRIVATE);}
 public static synchronized boolean unmeteredOnly(Context c){return prefs(c).getBoolean("unmeteredOnly",true);}
 public static synchronized void setUnmeteredOnly(Context c,boolean value){pause(c);if(!prefs(c).edit().putBoolean("unmeteredOnly",value).commit())throw new IllegalStateException("Could not save background data policy");}
 public static synchronized boolean enabled(Context c){return prefs(c).getBoolean("enabled",false);}
 public static synchronized String generation(Context c){return prefs(c).getString("generation","");}
 public static synchronized void resume(Context c)throws Exception{
  if(!prefs(c).edit().putBoolean("enabled",true).putString("generation",UUID.randomUUID().toString()).commit())throw new IllegalStateException("Could not enable receipt checks");
  Constraints constraints=new Constraints.Builder().setRequiredNetworkType(unmeteredOnly(c)?NetworkType.UNMETERED:NetworkType.CONNECTED).setRequiresBatteryNotLow(true).setRequiresStorageNotLow(true).build();PeriodicWorkRequest work=new PeriodicWorkRequest.Builder(ReceiptWatchWorker.class,15,TimeUnit.MINUTES).setConstraints(constraints).setBackoffCriteria(BackoffPolicy.EXPONENTIAL,30,TimeUnit.SECONDS).build();
  try{WorkManager.getInstance(c).enqueueUniquePeriodicWork(NAME,ExistingPeriodicWorkPolicy.KEEP,work).getResult().get(10,TimeUnit.SECONDS);}catch(Exception e){pause(c);throw new IllegalStateException("Receipt scheduler could not be confirmed; resume explicitly later");}
 }
 public static synchronized void pause(Context c){if(!prefs(c).edit().putBoolean("enabled",false).putString("generation",UUID.randomUUID().toString()).commit())throw new IllegalStateException("Could not pause receipt checks");WorkManager.getInstance(c).cancelUniqueWork(NAME);}
 public static synchronized void pauseIfUnchanged(Context c,String generation){if(generation.equals(generation(c)))pause(c);}
}
