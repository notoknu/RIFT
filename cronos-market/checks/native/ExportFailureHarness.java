package io.rift.cronos;
import java.io.*;import java.security.*;import java.util.*;
/** Real JVM streams with injected faults; not SAF or Android lifecycle acceptance. */
public final class ExportFailureHarness {
 static int checks;
 interface Op {void run() throws Exception;}
 static void check(boolean value){checks++;if(!value)throw new AssertionError("check "+checks);}
 static Exception rejects(Op op)throws Exception{try{op.run();}catch(Exception e){checks++;return e;}throw new AssertionError("unexpected success");}
 static String hash(byte[] value)throws Exception{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value));}
 static final byte[] DATA={1,2,3,4};
 static final class FaultStream extends OutputStream {
  int writes,closes;boolean writeFault,flushFault,closeFault;ByteArrayOutputStream bytes=new ByteArrayOutputStream();
  public void write(int value)throws IOException{writes++;bytes.write(value);if(writeFault)throw new IOException("partial write");}
  public void flush()throws IOException{if(flushFault)throw new IOException("flush failed");}
  public void close()throws IOException{closes++;if(closeFault)throw new IOException("close failed");}
 }
 static ExportSession session(FaultStream stream)throws Exception{return new ExportSession(stream,DATA.length,hash(DATA),0);}
 static void terminal(ExportSession session,FaultStream stream)throws Exception{
  check(!session.verified());int writes=stream.writes,closes=stream.closes;
  rejects(()->session.append(0,DATA,1));rejects(()->session.finish(2));session.close();
  check(stream.writes==writes);check(stream.closes==closes);
 }
 public static void main(String[] args)throws Exception{
  FaultStream partial=new FaultStream();partial.writeFault=true;ExportSession a=session(partial);
  rejects(()->a.append(0,DATA,1));check(partial.bytes.size()==1);check(partial.closes==1);terminal(a,partial);
  FaultStream flush=new FaultStream();flush.flushFault=true;ExportSession b=session(flush);b.append(0,DATA,1);rejects(()->b.finish(2));check(flush.closes==1);terminal(b,flush);
  FaultStream close=new FaultStream();close.closeFault=true;ExportSession c=session(close);c.append(0,DATA,1);Exception failure=rejects(()->c.finish(2));check(failure.getSuppressed().length==1);terminal(c,close);
  FaultStream both=new FaultStream();both.writeFault=true;both.closeFault=true;ExportSession d=session(both);Exception write=rejects(()->d.append(0,DATA,1));check(write.getMessage().equals("partial write"));check(write.getSuppressed().length==1);terminal(d,both);
  FaultStream mismatch=new FaultStream();ExportSession e=new ExportSession(mismatch,4,hash(new byte[4]),0);e.append(0,DATA,1);rejects(()->e.finish(2));check(mismatch.closes==1);terminal(e,mismatch);
  for(long now:new long[]{-1,120001}){FaultStream timeout=new FaultStream();ExportSession f=session(timeout);rejects(()->f.append(0,DATA,now));check(timeout.closes==1);terminal(f,timeout);}
  FaultStream incomplete=new FaultStream();ExportSession g=session(incomplete);rejects(()->g.finish(1));g.append(0,DATA,2);g.finish(3);check(g.verified());check(Arrays.equals(incomplete.bytes.toByteArray(),DATA));
  rejects(()->new ExportSession(null,4,hash(DATA),0));
  System.out.println("Export failure isolation assertions passed: "+checks);
 }
}
