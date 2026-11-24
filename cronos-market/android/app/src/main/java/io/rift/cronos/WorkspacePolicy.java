package io.rift.cronos;
import java.util.*;
/** Pure allowlist for the personal-data channel. Address selection is not authentication. */
public final class WorkspacePolicy {
 public static final int MESSAGE_MAX=4*1024*1024;
 private WorkspacePolicy(){}
 public static String account(String value){if(value==null||!value.matches("25:(device|0x[a-f0-9]{40})"))throw new IllegalArgumentException("Invalid local profile");return value;}
 public static String id(String value){if(value==null||!value.matches("[a-f0-9-]{36}"))throw new IllegalArgumentException("Invalid request ID");return value;}
 public static String operation(String value){if(!Arrays.asList("list","save","remove","export","import").contains(value))throw new IllegalArgumentException("Unsupported personal-data operation");return value;}
}
