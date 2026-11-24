package io.rift.cronos;
import java.math.BigInteger;import java.nio.*;import java.nio.charset.*;
/** Strict single dynamic ABI string decoder, bounded before allocation. Never executes or fetches a URI. */
public final class AbiString {
 private AbiString(){}
 public static String decode(Object value)throws Exception{
  if(!(value instanceof String))throw new IllegalArgumentException("Unsupported URI response");String hex=(String)value;
  if(hex.length()>2+(64+16384+31)*2||!hex.matches("0x(?:[0-9a-fA-F]{64}){2,}"))throw new IllegalArgumentException("Invalid or oversized ABI string");
  if(!new BigInteger(hex.substring(2,66),16).equals(BigInteger.valueOf(32)))throw new IllegalArgumentException("Invalid ABI offset");BigInteger length=new BigInteger(hex.substring(66,130),16);if(length.signum()<0||length.compareTo(BigInteger.valueOf(16384))>0)throw new IllegalArgumentException("URI exceeds 16 KiB");int n=length.intValue(),padded=((n+31)/32)*32;if(hex.length()!=130+padded*2)throw new IllegalArgumentException("Invalid ABI string length");
  byte[] bytes=new byte[n];for(int i=0;i<n;i++)bytes[i]=(byte)Integer.parseInt(hex.substring(130+i*2,132+i*2),16);for(int i=130+n*2;i<hex.length();i++)if(hex.charAt(i)!='0')throw new IllegalArgumentException("Invalid ABI padding");return StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString();
 }
}
