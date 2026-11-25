package io.rift.cronos;
import java.io.*;import java.security.*;
/** Bounded sequenced staging, testable on a JVM. Destination is untouched until finish verifies SHA-256. */
public final class ExportSession implements Closeable {
 private final OutputStream stage;private final MessageDigest digest;private final long size,started;private final String expected;private int sequence;private long count;private boolean closed,verified;
 public ExportSession(OutputStream stage,long size,String expected,long now) throws Exception {if(stage==null||size<0||size>FilePolicy.EXPORT_MAX||expected==null||!expected.matches("[a-f0-9]{64}"))throw new IllegalArgumentException("Invalid export stream/size/hash");this.stage=stage;this.size=size;this.expected=expected;this.started=now;digest=MessageDigest.getInstance("SHA-256");}
 // A staging stream can write partially before throwing. Never allow retry after I/O failure.
 private void abort(Exception failure){closed=true;verified=false;try{stage.close();}catch(Exception cleanup){if(cleanup!=failure)failure.addSuppressed(cleanup);}}
 private void active(long now){if(closed||verified)throw new IllegalStateException("Export is closed");if(now<started||now-started>120000){IllegalStateException failure=new IllegalStateException("Export timed out");abort(failure);throw failure;}}
 public synchronized void append(int seq,byte[] bytes,long now) throws Exception {active(now);if(seq!=sequence||bytes==null||bytes.length==0||bytes.length>FilePolicy.CHUNK_MAX||count+bytes.length>size)throw new IllegalArgumentException("Invalid export sequence/size");try{stage.write(bytes);}catch(Exception failure){abort(failure);throw failure;}digest.update(bytes);count+=bytes.length;sequence++;}
 public synchronized void finish(long now) throws Exception {active(now);if(count!=size)throw new IllegalStateException("Incomplete export");try{byte[] hash=digest.digest();StringBuilder actual=new StringBuilder();for(byte b:hash)actual.append(String.format(java.util.Locale.ROOT,"%02x",b&255));if(!actual.toString().equals(expected))throw new IllegalStateException("Export checksum mismatch");stage.flush();stage.close();verified=true;closed=true;}catch(Exception failure){abort(failure);throw failure;}}
 public synchronized boolean verified(){return verified;}
 @Override public synchronized void close() throws IOException {if(!closed){closed=true;stage.close();}}
}
