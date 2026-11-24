package io.rift.cronos;
import android.graphics.*;import android.util.Base64;import org.json.*;import java.io.*;
/** Bounded native raster-only conversion. Never returns original remote bytes to WebView. */
public final class RasterPreview {
 public static final int INPUT_MAX=131072,OUTPUT_MAX=65536;private RasterPreview(){}
 public static JSONObject decode(byte[] bytes,String type)throws Exception{
  RasterPolicy.header(bytes,type);
  BitmapFactory.Options bounds=new BitmapFactory.Options();bounds.inJustDecodeBounds=true;BitmapFactory.decodeByteArray(bytes,0,bytes.length,bounds);RasterPolicy.dimensions(bounds.outWidth,bounds.outHeight);
  if(!type.equals(bounds.outMimeType))throw new IOException("Image decoder MIME mismatch");BitmapFactory.Options opts=new BitmapFactory.Options();opts.inPreferredConfig=Bitmap.Config.ARGB_8888;opts.inSampleSize=RasterPolicy.sample(bounds.outWidth,bounds.outHeight);
  Bitmap decoded=null,scaled=null;try{decoded=BitmapFactory.decodeByteArray(bytes,0,bytes.length,opts);if(decoded==null)throw new IOException("Image decode failed");int w=decoded.getWidth(),h=decoded.getHeight();double ratio=Math.min(1.0,256.0/Math.max(w,h));scaled=Bitmap.createScaledBitmap(decoded,Math.max(1,(int)(w*ratio)),Math.max(1,(int)(h*ratio)),true);ByteArrayOutputStream out=new ByteArrayOutputStream();if(!scaled.compress(Bitmap.CompressFormat.PNG,100,out)||out.size()>OUTPUT_MAX)throw new IOException("Preview exceeds output budget");return new JSONObject().put("dataUri","data:image/png;base64,"+Base64.encodeToString(out.toByteArray(),Base64.NO_WRAP)).put("width",scaled.getWidth()).put("height",scaled.getHeight()).put("originalWidth",bounds.outWidth).put("originalHeight",bounds.outHeight).put("outputBytes",out.size());}catch(OutOfMemoryError e){throw new IOException("Preview memory unavailable; no preview returned");}finally{if(scaled!=null&&scaled!=decoded)scaled.recycle();if(decoded!=null)decoded.recycle();}
 }
}
