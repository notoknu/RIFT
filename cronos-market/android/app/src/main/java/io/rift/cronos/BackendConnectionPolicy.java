package io.rift.cronos;

/** One backend-connected product, with an explicit user pause (not a second app mode). */
public final class BackendConnectionPolicy {
    public static final String DEFAULT_ORIGIN="https://rift-q6qs.onrender.com";
    private BackendConnectionPolicy(){}
    public static String origin(String configured){return configured==null||configured.isEmpty()?DEFAULT_ORIGIN:configured;}
    public static String mode(String choice){return "paused".equals(choice)?"offline":"hybrid";}
}
