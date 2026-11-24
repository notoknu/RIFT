package io.rift.cronos;
import java.io.*;import java.net.*;import java.util.concurrent.*;
/** One operation's monotonic deadline and cancellation handle, shared across its RPC calls. */
public final class RequestControl implements AutoCloseable {
 private static final ScheduledThreadPoolExecutor TIMER=timer();
 private static ScheduledThreadPoolExecutor timer(){ScheduledThreadPoolExecutor value=new ScheduledThreadPoolExecutor(1,r->{Thread t=new Thread(r,"rift-read-deadlines");t.setDaemon(true);return t;});value.setRemoveOnCancelPolicy(true);return value;}
 final long deadline;private ScheduledFuture<?> deadlineTask;private boolean cancelled;private Socket socket;private Future<?> resolving;
 public RequestControl(long timeoutMillis){if(timeoutMillis<1||timeoutMillis>120000)throw new IllegalArgumentException("Invalid request deadline");deadline=System.nanoTime()+TimeUnit.MILLISECONDS.toNanos(timeoutMillis);deadlineTask=TIMER.schedule(this::close,timeoutMillis,TimeUnit.MILLISECONDS);}
 public synchronized int remaining(int maximum)throws IOException{if(cancelled||Thread.currentThread().isInterrupted())throw new IOException("Read cancelled");long ms=TimeUnit.NANOSECONDS.toMillis(deadline-System.nanoTime());if(ms<=0)throw new IOException("Read deadline exceeded");return (int)Math.max(1,Math.min(maximum,ms));}
 public synchronized void socket(Socket next)throws IOException{remaining(10000);socket=next;}
 public synchronized void dns(Future<?> next)throws IOException{try{remaining(10000);resolving=next;}catch(IOException e){next.cancel(true);throw e;}}
 public synchronized void clearDns(Future<?> task){if(resolving==task)resolving=null;}
 @Override public synchronized void close(){cancelled=true;if(deadlineTask!=null)deadlineTask.cancel(false);if(resolving!=null)resolving.cancel(true);if(socket!=null)try{socket.close();}catch(IOException ignored){}}
}
