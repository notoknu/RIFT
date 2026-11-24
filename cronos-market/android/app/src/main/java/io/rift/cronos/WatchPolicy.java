package io.rift.cronos;
/** Bounded observations, never transaction submission or a finality claim. */
public final class WatchPolicy {
 public static final int MAX_WATCHES=20,MAX_ATTEMPTS=96;public static final long INTERVAL=15*60*1000L,MAX_AGE=48*60*60*1000L;
 private WatchPolicy(){}
 public static boolean expired(long created,long now,int attempts){return created<0||now<created||now-created>=MAX_AGE||attempts>=MAX_ATTEMPTS;}
 public static long next(long now,int attempt,boolean error){if(now<0||attempt<1)throw new IllegalArgumentException("Invalid watch checkpoint");long delay=error?Math.min(6*60*60*1000L,INTERVAL*(1L<<Math.min(attempt-1,5))):INTERVAL;return Math.addExact(now,delay);}
}
