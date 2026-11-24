package io.rift.cronos;
import java.io.*;import java.nio.file.Files;import java.util.*;
/** Snapshot old staging at process startup; never walk newly-created session roots. */
public final class StagingCleanup {
 private StagingCleanup(){}
 public static List<File> snapshot(File cache){List<File> found=new ArrayList<>();File[] imports=new File(cache,"imports").listFiles();if(imports!=null)for(File file:imports)if(file.getName().matches("[a-f0-9-]{36}"))found.add(file);File[] files=cache.listFiles();if(files!=null)for(File file:files)if(file.isFile()&&file.getName().matches("rift-export-[A-Za-z0-9-]+\\.tmp"))found.add(file);return found;}
 public static void remove(File cache,List<File> snapshot){for(File file:snapshot)try{String base=cache.getCanonicalPath()+File.separator;if(file.getCanonicalPath().startsWith(base))removeInside(file,cache.getCanonicalFile(),0);}catch(IOException ignored){}}
 private static void removeInside(File file,File base,int depth)throws IOException{if(depth>4||Files.isSymbolicLink(file.toPath())||!file.getCanonicalPath().startsWith(base.getPath()+File.separator))return;File[] children=file.listFiles();if(children!=null)for(File child:children)removeInside(child,base,depth+1);file.delete();}
}
