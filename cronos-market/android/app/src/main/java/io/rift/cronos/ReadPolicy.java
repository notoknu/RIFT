package io.rift.cronos;
import java.math.BigInteger;import java.util.*;
/** Pure known-asset input policy. No caller-selected endpoint, arbitrary calldata or write method. */
public final class ReadPolicy {
 private ReadPolicy(){}
 public static String operation(String op){if(!Arrays.asList("holdings","status","balance","nft","receipt","observations","tokenUri","metadata","artwork","discover","indexStatus","indexStart","indexResume","indexDelete").contains(op))throw new IllegalArgumentException("Unsupported read operation");return op;}
 public static String address(String value){if(value==null||!value.matches("0x[0-9a-fA-F]{40}"))throw new IllegalArgumentException("Enter a 0x-prefixed 40-hex address");return value.toLowerCase(Locale.ROOT);}
 public static String token(String value){if(value==null||!value.matches("[0-9]{1,78}"))throw new IllegalArgumentException("Invalid token ID");BigInteger n=new BigInteger(value);if(n.bitLength()>256)throw new IllegalArgumentException("Token ID exceeds uint256");return n.toString();}
 public static String hash(String value){if(value==null||!value.matches("0x[0-9a-fA-F]{64}"))throw new IllegalArgumentException("Invalid transaction hash");return value.toLowerCase(Locale.ROOT);}
 public static String standard(String value){if(!Arrays.asList("ERC-721","ERC-1155").contains(value))throw new IllegalArgumentException("Unsupported NFT standard");return value;}
}
