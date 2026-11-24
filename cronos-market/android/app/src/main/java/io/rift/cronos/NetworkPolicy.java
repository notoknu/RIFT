package io.rift.cronos;

import java.net.*;
import java.util.Locale;

/** Pure Java policy, also exercised outside Android. Public HTTPS only; redirects refused by callers. */
public final class NetworkPolicy {
    private NetworkPolicy() {}
    public static URI endpoint(String value, boolean originOnly) throws Exception {
        if(value==null||value.length()>2048||!value.equals(value.trim()))throw new IllegalArgumentException("Invalid endpoint");
        URI uri=new URI(value);
        if(!"https".equals(uri.getScheme())||uri.getHost()==null||uri.getRawUserInfo()!=null||uri.getRawFragment()!=null||(uri.getPort()!=-1&&uri.getPort()!=443))throw new IllegalArgumentException("Use public HTTPS without credentials, fragment or alternate port");
        String host=uri.getHost().toLowerCase(Locale.ROOT);
        if(host.equals("localhost")||host.endsWith(".localhost")||host.endsWith(".local")||!host.contains(".")||host.indexOf(':')>=0||host.matches("[0-9.]+"))throw new IllegalArgumentException("Use a public DNS hostname, not a local or literal address");
        if(originOnly&&(!value.equals("https://"+uri.getRawAuthority())||uri.getRawQuery()!=null))throw new IllegalArgumentException("Use an exact HTTPS origin without path or trailing slash");
        return uri;
    }
    public static boolean publicAddress(InetAddress address) {
        if(address.isAnyLocalAddress()||address.isLoopbackAddress()||address.isLinkLocalAddress()||address.isSiteLocalAddress()||address.isMulticastAddress())return false;
        byte[] b=address.getAddress();int a=b[0]&255;
        if(b.length==4){int c=b[1]&255,d=b[2]&255;
            return !(a==0||a==10||a==127||a>=224||a==100&&c>=64&&c<=127||a==169&&c==254||a==172&&c>=16&&c<=31||a==192&&(c==168||c==0||c==2)||a==198&&(c==18||c==19||c==51&&d==100)||a==203&&c==0&&d==113);
        }
        // Conservative IPv6: global unicast only, reject documentation/6to4/Teredo.
        if(b.length!=16||(a&0xe0)!=0x20)return false;
        int c=b[1]&255,d=b[2]&255,e=b[3]&255;
        return !(a==0x20&&c==0x01&&(d==0x0d&&e==0xb8||d==0&&e==0))&&!(a==0x20&&c==0x02);
    }
    public static void resolvePublic(URI uri) throws Exception {
        InetAddress[] addresses=InetAddress.getAllByName(uri.getHost());
        if(addresses.length==0)throw new IllegalArgumentException("Host did not resolve");
        for(InetAddress address:addresses)if(!publicAddress(address))throw new IllegalArgumentException("Non-public destination refused");
    }
    public static String displayHost(String value) {try{return endpoint(value,false).getHost();}catch(Exception e){return "Not configured";}}
}
