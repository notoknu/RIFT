package io.rift.cronos;

import javax.net.ssl.*;
import java.net.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Bounded HTTP/1.1 RPC POST and fixed-gateway JSON/raster GET over TLS. Connects only to the IPs we validated,
 * while retaining DNS-host TLS certificate validation and SNI. No redirects or HTTP proxy. */
public final class PinnedHttps {
    private PinnedHttps() {}
    public static final class Result {public final int status;public final byte[] body;public final String contentType;Result(int status,byte[] body){this(status,body,"");}Result(int status,byte[] body,String type){this.status=status;this.body=body;contentType=type;}}
    private static final int MAX=262144;
    public static Result post(String endpoint,String token,byte[] payload) throws Exception {try(RequestControl control=new RequestControl(30000)){return post(endpoint,token,payload,control);}}
    public static Result post(String endpoint,String token,byte[] payload,RequestControl control) throws Exception {
        return request(endpoint,token,payload,control,"POST",MAX,"application/json");
    }
    public static Result metadata(String uri,RequestControl control)throws Exception{return request(MetadataPolicy.endpoint(uri),"",new byte[0],control,"GET",MetadataPolicy.MAX_BYTES,"application/json");}
    public static Result artwork(String uri,RequestControl control)throws Exception{return request(MetadataPolicy.endpoint(uri),"",new byte[0],control,"GET",131072,"image/png,image/jpeg");}
    public static Result metadata(String uri,String gateway,RequestControl control)throws Exception{return request(MetadataPolicy.requestEndpoint(uri,gateway),"",new byte[0],control,"GET",MetadataPolicy.MAX_BYTES,"application/json");}
    public static Result artwork(String uri,String gateway,RequestControl control)throws Exception{return request(MetadataPolicy.requestEndpoint(uri,gateway),"",new byte[0],control,"GET",131072,"image/png,image/jpeg");}
    public static Result health(String origin,RequestControl control)throws Exception{NetworkPolicy.endpoint(origin,true);return request(origin+"/healthz","",new byte[0],control,"GET",65536,"application/json");}
    private static Result request(String endpoint,String token,byte[] payload,RequestControl control,String method,int maximum,String accepted)throws Exception {
        URI uri=NetworkPolicy.endpoint(endpoint,false);if(token.length()>8192||token.contains("\r")||token.contains("\n"))throw new IllegalArgumentException("Invalid credential");
        InetAddress[] addresses=BoundedDns.SYSTEM.resolve(uri.getHost(),control);if(addresses.length==0)throw new IOException("DNS unavailable");for(InetAddress address:addresses)if(!NetworkPolicy.publicAddress(address))throw new IOException("Non-public destination refused");
        final long deadline=control.deadline;
        Socket tcp=new Socket();try{control.socket(tcp);
            // No second DNS lookup between policy and socket connect (DNS-rebinding resistance).
            tcp.connect(new InetSocketAddress(addresses[0],443),control.remaining(8000));tcp.setSoTimeout(control.remaining(10000));
            try(SSLSocket socket=(SSLSocket)((SSLSocketFactory)SSLSocketFactory.getDefault()).createSocket(tcp,uri.getHost(),443,true)){
                socket.setSoTimeout(control.remaining(10000));SSLParameters params=socket.getSSLParameters();params.setEndpointIdentificationAlgorithm("HTTPS");params.setServerNames(Collections.singletonList(new SNIHostName(uri.getHost())));socket.setSSLParameters(params);socket.startHandshake();control.remaining(10000);
                URI ascii=new URI(uri.toASCIIString());String path=ascii.getRawPath();if(path==null||path.isEmpty())path="/";if(ascii.getRawQuery()!=null)path+="?"+ascii.getRawQuery();
                String headers=method+" "+path+" HTTP/1.1\r\nHost: "+uri.getHost()+"\r\nContent-Type: application/json\r\nAccept: "+accepted+"\r\nAccept-Encoding: identity\r\nConnection: close\r\nContent-Length: "+payload.length+"\r\n"+(token.isEmpty()?"":"Authorization: Bearer "+token+"\r\n")+"\r\n";
                OutputStream out=socket.getOutputStream();out.write(headers.getBytes(StandardCharsets.US_ASCII));out.write(payload);out.flush();
                InputStream input=new BufferedInputStream(socket.getInputStream());return readResponse(input,socket,deadline,maximum,accepted);
            }
        }finally{tcp.close();}
    }
    static Result readResponse(InputStream input,Socket socket,long deadline) throws IOException {return readResponse(input,socket,deadline,MAX);}
    static Result readResponse(InputStream input,Socket socket,long deadline,int maximum) throws IOException {return readResponse(input,socket,deadline,maximum,"application/json");}
    static Result readResponse(InputStream input,Socket socket,long deadline,int maximum,String accepted) throws IOException {
                if(maximum<1||maximum>MAX)throw new IOException("Invalid response budget");
                String statusLine=line(input,4096,deadline,socket);if(!statusLine.matches("HTTP/1\\.[01] [0-9]{3}(?: .*)?"))throw new IOException("Invalid HTTP status");int status=Integer.parseInt(statusLine.substring(9,12));
                Map<String,String> responseHeaders=new HashMap<>();int total=0;for(int i=0;i<100;i++){String h=line(input,8192,deadline,socket);total+=h.length();if(total>16384)throw new IOException("Header limit exceeded");if(h.isEmpty())break;if(i==99||h.startsWith(" ")||h.startsWith("\t")||!h.contains(":"))throw new IOException("Invalid HTTP headers");int colon=h.indexOf(':');String name=h.substring(0,colon).toLowerCase(Locale.ROOT),value=h.substring(colon+1).trim();if(responseHeaders.containsKey(name)&&(name.equals("content-length")||name.equals("transfer-encoding")||name.equals("content-type")))throw new IOException("Ambiguous HTTP framing");responseHeaders.put(name,value);}
                if(status!=200)return new Result(status,new byte[0]);
                String encoding=responseHeaders.get("content-encoding");if(encoding!=null&&!encoding.equalsIgnoreCase("identity"))throw new IOException("Compressed response not accepted");String type=responseHeaders.get("content-type");if(type==null)throw new IOException("Response MIME missing");type=type.split(";",2)[0].trim().toLowerCase(Locale.ROOT);if(!Arrays.asList(accepted.split(",")).contains(type))throw new IOException("Response MIME refused");
                String transfer=responseHeaders.get("transfer-encoding"),length=responseHeaders.get("content-length");if(transfer!=null&&length!=null)throw new IOException("Ambiguous HTTP framing");ByteArrayOutputStream body=new ByteArrayOutputStream();
                if(transfer!=null){if(!transfer.equalsIgnoreCase("chunked"))throw new IOException("Unsupported HTTP transfer");while(true){String chunk=line(input,128,deadline,socket);String size=chunk.split(";",2)[0];if(!size.matches("[0-9a-fA-F]{1,8}"))throw new IOException("Invalid chunk");long count=Long.parseLong(size,16);if(count==0)break;if(count>maximum-body.size())throw new IOException("Response limit exceeded");copy(input,body,(int)count,deadline,socket);if(!line(input,2,deadline,socket).isEmpty())throw new IOException("Invalid chunk boundary");}}
                else if(length!=null){if(!length.matches("[0-9]{1,9}"))throw new IOException("Invalid response length");long count=Long.parseLong(length);if(count>maximum)throw new IOException("Response limit exceeded");copy(input,body,(int)count,deadline,socket);}
                else{byte[] buffer=new byte[4096];while(true){remaining(deadline,socket);int n=input.read(buffer);if(n<0)break;if(body.size()+n>maximum)throw new IOException("Response limit exceeded");body.write(buffer,0,n);}}
                return new Result(status,body.toByteArray(),type);
    }
    private static void remaining(long deadline,Socket socket) throws IOException {long ms=(deadline-System.nanoTime())/1000000;if(ms<=0)throw new IOException("Request time limit exceeded");socket.setSoTimeout((int)Math.max(1,Math.min(10000,ms)));}
    private static String line(InputStream input,int max,long deadline,Socket socket) throws IOException {ByteArrayOutputStream line=new ByteArrayOutputStream();while(true){remaining(deadline,socket);int b=input.read();if(b<0)throw new EOFException("Incomplete HTTP headers");if(b=='\n'){byte[] bytes=line.toByteArray();if(bytes.length==0||bytes[bytes.length-1]!='\r')throw new IOException("Invalid HTTP line");return new String(bytes,0,bytes.length-1,StandardCharsets.US_ASCII);}if(line.size()>=max)throw new IOException("HTTP line limit exceeded");line.write(b);}}
    private static void copy(InputStream input,ByteArrayOutputStream out,int count,long deadline,Socket socket) throws IOException {byte[] buffer=new byte[4096];while(count>0){remaining(deadline,socket);int n=input.read(buffer,0,Math.min(count,buffer.length));if(n<0)throw new EOFException("Incomplete body");out.write(buffer,0,n);count-=n;}}
}
