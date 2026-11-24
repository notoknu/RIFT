package io.rift.cronos;
import java.net.*;import java.io.*;import java.util.concurrent.*;
/** At most two resolver threads; blocked OS DNS cannot create unbounded abandoned threads. */
public final class BoundedDns implements AutoCloseable {
 public interface Resolver {InetAddress[] lookup(String host)throws Exception;}
 public static final BoundedDns SYSTEM=new BoundedDns(InetAddress::getAllByName);
 private final ThreadPoolExecutor pool;private final Resolver resolver;
 public BoundedDns(Resolver resolver){this.resolver=resolver;pool=new ThreadPoolExecutor(0,2,15,TimeUnit.SECONDS,new SynchronousQueue<>(),r->{Thread t=new Thread(r,"rift-bounded-dns");t.setDaemon(true);return t;},new ThreadPoolExecutor.AbortPolicy());}
 public InetAddress[] resolve(String host,RequestControl control)throws IOException{
  Future<InetAddress[]> future;try{control.remaining(8000);future=pool.submit(()->resolver.lookup(host));}catch(RejectedExecutionException e){throw new IOException("DNS resolver busy");}
  try{control.dns(future);InetAddress[] values=future.get(control.remaining(8000),TimeUnit.MILLISECONDS);if(values==null||values.length==0||values.length>64)throw new IOException("Invalid DNS response");return values;}
  catch(InterruptedException e){Thread.currentThread().interrupt();throw new IOException("DNS cancelled");}catch(ExecutionException|TimeoutException|CancellationException e){throw new IOException("DNS unavailable or timed out");}
  finally{future.cancel(true);control.clearDns(future);}
 }
 @Override public void close(){pool.shutdownNow();}
}
