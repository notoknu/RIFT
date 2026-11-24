package io.rift.cronos;
import java.io.*;import java.security.*;import java.util.*;
public class FileTransferHarness {
 static int checks;static void check(boolean x){checks++;if(!x)throw new AssertionError();}interface Op{void run()throws Exception;}static void rejects(Op op)throws Exception{try{op.run();}catch(Exception e){checks++;return;}throw new AssertionError("accepted");}
 static String hash(byte[] b)throws Exception{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(b));}
 public static void main(String[] args)throws Exception{
 for(String s:new String[]{"../x.json","a..json","x.html","/a.zip","a.js","a.json?x"})rejects(()->FilePolicy.filename(s));check(FilePolicy.mime("Art.PNG").equals("image/png"));check(FilePolicy.sameOrigin("https://rift.example","https://rift.example:443"));for(String s:new String[]{"http://rift.example","https://rift.example.evil","https://rift.example:444","https://user@rift.example","https://rift.example/path"})check(!FilePolicy.sameOrigin("https://rift.example",s));
 byte[] b="data".getBytes();ByteArrayOutputStream out=new ByteArrayOutputStream();ExportSession ok=new ExportSession(out,4,hash(b),0);ok.append(0,b,1);ok.finish(2);check(ok.verified());check(Arrays.equals(b,out.toByteArray()));rejects(()->ok.append(1,b,3));
 rejects(()->new ExportSession(out,FilePolicy.EXPORT_MAX+1L,hash(b),0));rejects(()->new ExportSession(out,1,"wrong",0));
 try(ExportSession s=new ExportSession(new ByteArrayOutputStream(),4,hash(b),0)){rejects(()->s.append(1,b,1));rejects(()->s.append(0,new byte[5],1));rejects(()->s.append(0,b,120001));rejects(()->s.finish(1));}
 try(ExportSession s=new ExportSession(new ByteArrayOutputStream(),4,hash(new byte[4]),0)){s.append(0,b,1);rejects(()->s.finish(2));}
 try(ExportSession s=new ExportSession(new ByteArrayOutputStream(),0,hash(new byte[0]),0)){s.finish(1);check(s.verified());}
 System.out.println("File transfer assertions passed: "+checks);
 }
}
