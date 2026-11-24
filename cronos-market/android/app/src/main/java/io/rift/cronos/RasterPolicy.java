package io.rift.cronos;
import java.io.*;
/** Pure budgets/signature checks, independently JVM-testable. Decoding still needs Android tests. */
public final class RasterPolicy {
 private RasterPolicy(){}
 public static void header(byte[] bytes,String type)throws IOException{if(bytes==null||bytes.length<8||bytes.length>131072)throw new IOException("Image input budget exceeded");boolean png=type.equals("image/png")&&(bytes[0]&255)==137&&bytes[1]==80&&bytes[2]==78&&bytes[3]==71&&bytes[4]==13&&bytes[5]==10&&bytes[6]==26&&bytes[7]==10,jpeg=type.equals("image/jpeg")&&(bytes[0]&255)==255&&(bytes[1]&255)==216&&(bytes[2]&255)==255;if(!png&&!jpeg)throw new IOException("Only MIME/signature-matched PNG or JPEG previews allowed");}
 public static void dimensions(int width,int height)throws IOException{if(width<1||height<1||width>2048||height>2048||(long)width*height>1048576)throw new IOException("Image dimensions exceed preview budget");}
 public static int sample(int width,int height)throws IOException{dimensions(width,height);int n=1;while(Math.max(width,height)/n>256)n*=2;return n;}
}
