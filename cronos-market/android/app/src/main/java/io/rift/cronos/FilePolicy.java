package io.rift.cronos;
import java.util.*;
/** Pure data-file policy. No executable/HTML exports and no caller-selected native paths. */
public final class FilePolicy {
 public static final int EXPORT_MAX=8*1024*1024,IMPORT_FILE_MAX=25*1024*1024,IMPORT_TOTAL_MAX=128*1024*1024,IMPORT_COUNT_MAX=128,CHUNK_MAX=24576;
 private FilePolicy(){}
 public static String filename(String name){if(name==null||name.length()>120||!name.matches("[A-Za-z0-9][A-Za-z0-9._ -]*")||name.contains(".."))throw new IllegalArgumentException("Use a simple data filename up to 120 characters");String n=name.toLowerCase(Locale.ROOT);if(!(n.endsWith(".json")||n.endsWith(".zip")||n.endsWith(".txt")||n.endsWith(".svg")||n.endsWith(".png")||n.endsWith(".jpg")||n.endsWith(".jpeg")||n.endsWith(".webp")||n.endsWith(".gif")))throw new IllegalArgumentException("Unsupported data-file extension");return name;}
 public static String mime(String name){String n=filename(name).toLowerCase(Locale.ROOT);if(n.endsWith(".json"))return "application/json";if(n.endsWith(".zip"))return "application/zip";if(n.endsWith(".txt"))return "text/plain";if(n.endsWith(".svg"))return "image/svg+xml";if(n.endsWith(".png"))return "image/png";if(n.endsWith(".webp"))return "image/webp";if(n.endsWith(".gif"))return "image/gif";return "image/jpeg";}
 public static boolean sameOrigin(String expected,String candidate){try{java.net.URI a=new java.net.URI(expected),b=new java.net.URI(candidate);return "https".equals(b.getScheme())&&b.getHost()!=null&&b.getHost().equalsIgnoreCase(a.getHost())&&(b.getPort()==-1?443:b.getPort())==(a.getPort()==-1?443:a.getPort())&&b.getRawUserInfo()==null&&b.getRawQuery()==null&&b.getRawFragment()==null&&(b.getPath().isEmpty()||b.getPath().equals("/"));}catch(Exception e){return false;}}
 public static boolean allowedAccept(String value){if(value==null)return false;return Arrays.asList("application/json","application/zip","text/plain","image/svg+xml","image/png","image/jpeg","image/webp","image/gif","image/*",".json",".zip",".txt",".svg",".png",".jpg",".jpeg",".webp",".gif").contains(value.toLowerCase(Locale.ROOT));}
}
