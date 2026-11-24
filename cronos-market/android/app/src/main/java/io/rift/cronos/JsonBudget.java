package io.rift.cronos;
import java.nio.charset.StandardCharsets;
/** Pre-parse resource guard; actual JSON syntax and schema are still validated by the caller. */
public final class JsonBudget {
 private JsonBudget(){}
 public static String check(String raw,int maxBytes,int maxDepth){
  if(raw==null||raw.length()>maxBytes||raw.getBytes(StandardCharsets.UTF_8).length>maxBytes)throw new IllegalArgumentException("JSON size limit exceeded");
  int depth=0;boolean quoted=false,escaped=false;
  for(int i=0;i<raw.length();i++){char c=raw.charAt(i);if(quoted){if(escaped){escaped=false;continue;}if(c=='\\'){escaped=true;continue;}if(c=='"')quoted=false;continue;}if(c=='"'){quoted=true;continue;}if(c=='{'||c=='['){if(++depth>maxDepth)throw new IllegalArgumentException("JSON nesting limit exceeded");}else if(c=='}'||c==']'){if(--depth<0)throw new IllegalArgumentException("Invalid JSON nesting");}}
  if(quoted||depth!=0)throw new IllegalArgumentException("Incomplete JSON structure");return raw;
 }
}
