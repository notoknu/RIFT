package io.rift.cronos;

import java.io.*;
import java.math.BigInteger;
import java.util.*;
import org.json.*;

/** Explicit read-only RPC; no signing, wallet creation or transaction broadcasting methods. */
public final class ReadOnlyRpc implements TransferDiscovery.Rpc {
    public static final class ProviderFailure extends IOException {public ProviderFailure(String message){super(message);}}
    private static final Set<String> METHODS=new HashSet<>(Arrays.asList("eth_chainId","eth_blockNumber","eth_getBalance","eth_call","eth_getTransactionReceipt","eth_getLogs","eth_getBlockByNumber"));
    private static final ArrayDeque<Long> TIMES=new ArrayDeque<>();
    private final String endpoint,credential;private final RequestControl control;
    public ReadOnlyRpc(String endpoint,String credential){this(endpoint,credential,null);}
    public ReadOnlyRpc(String endpoint,String credential,RequestControl control){this.endpoint=endpoint;this.credential=credential;this.control=control;}
    private static synchronized void budget(){long now=android.os.SystemClock.elapsedRealtime();while(!TIMES.isEmpty()&&TIMES.peekFirst()<now-60000)TIMES.removeFirst();if(TIMES.size()>=30)throw new IllegalStateException("Local RPC budget reached; wait one minute");TIMES.addLast(now);}
    public Object call(String method,JSONArray params) throws Exception {
        if(!METHODS.contains(method))throw new IllegalArgumentException("RPC method not permitted");budget();
        byte[] payload=new JSONObject().put("jsonrpc","2.0").put("id",1).put("method",method).put("params",params).toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        PinnedHttps.Result response=control==null?PinnedHttps.post(endpoint,credential,payload):PinnedHttps.post(endpoint,credential,payload,control);int status=response.status;
        if(status==429)throw new ProviderFailure("Provider rate limit reached; wait before retrying");if(status==401||status==403)throw new ProviderFailure("Provider authentication rejected; replace your credential in settings");if(status!=200)throw new ProviderFailure("Provider unavailable or redirect refused (HTTP "+status+")");
        JSONObject data;try{data=new JSONObject(JsonBudget.check(new String(response.body,java.nio.charset.StandardCharsets.UTF_8),262144,32));}catch(Exception e){throw new IOException("Invalid provider JSON");}
        if(!"2.0".equals(data.optString("jsonrpc"))||data.optInt("id",-1)!=1||data.has("error")||!data.has("result"))throw new IOException("RPC response rejected");return data.get("result");
    }

    public void requireCronos() throws Exception {Object chain=call("eth_chainId",new JSONArray());if(!(chain instanceof String)||!"0x19".equals(chain))throw new IllegalStateException("Wrong chain: Cronos mainnet 25 required");}
    public static String address(String value){return ReadPolicy.address(value);}
    public static String token(String value){return ReadPolicy.token(value);}
    public static String word(String hex){if(!hex.matches("[0-9a-fA-F]{1,64}"))throw new IllegalArgumentException("Invalid ABI word");return String.format("%64s",hex.toLowerCase(Locale.ROOT)).replace(' ','0');}
    private static String hex(Object value){if(!(value instanceof String)||!((String)value).matches("0x(?:0|[1-9a-fA-F][0-9a-fA-F]{0,63})"))throw new IllegalArgumentException("Invalid RPC quantity");return (String)value;}
    public JSONObject balance(String owner,String contract) throws Exception {
        owner=address(owner);requireCronos();String block=hex(call("eth_blockNumber",new JSONArray()));
        if(contract.isEmpty()){String raw=hex(call("eth_getBalance",new JSONArray().put(owner).put(block)));return new JSONObject().put("chainId",25).put("owner",owner).put("asset","CRO").put("rawBalance",new BigInteger(raw.substring(2),16).toString()).put("balance",new java.math.BigDecimal(new BigInteger(raw.substring(2),16),18).toPlainString()).put("block",block).put("sourceHost",NetworkPolicy.displayHost(endpoint));}
        contract=address(contract);String data="0x70a08231"+word(owner.substring(2));String raw=(String)call("eth_call",new JSONArray().put(new JSONObject().put("to",contract).put("data",data)).put(block));
        if(!raw.matches("0x[0-9a-fA-F]{64}"))throw new IOException("Unsupported token balance response");return new JSONObject().put("chainId",25).put("owner",owner).put("contract",contract).put("rawBalance",new BigInteger(raw.substring(2),16).toString()).put("note","Raw units only; decimals/name not asserted. Does not discover other assets.").put("block",block).put("sourceHost",NetworkPolicy.displayHost(endpoint));
    }
    public JSONObject nft(String owner,String contract,String id,boolean multi) throws Exception {
        owner=address(owner);contract=address(contract);id=token(id);requireCronos();String block=hex(call("eth_blockNumber",new JSONArray()));String data=multi?"0x00fdd58e"+word(owner.substring(2))+word(new BigInteger(id).toString(16)):"0x6352211e"+word(new BigInteger(id).toString(16));
        Object result=call("eth_call",new JSONArray().put(new JSONObject().put("to",contract).put("data",data)).put(block));if(!(result instanceof String)||!((String)result).matches("0x[0-9a-fA-F]{64}"))throw new IOException("Unsupported ownership response");String raw=((String)result).substring(2),actual=multi?"":"0x"+raw.substring(24);if(!multi&&!raw.substring(0,24).equals("000000000000000000000000"))throw new IOException("Invalid owner response");
        return new JSONObject().put("chainId",25).put("contract",contract).put("tokenId",id).put("standard",multi?"ERC-1155":"ERC-721").put("owner",multi?owner:actual.toLowerCase(Locale.ROOT)).put("amount",multi?new BigInteger(raw,16).toString():actual.equalsIgnoreCase(owner)?"1":"0").put("block",block).put("sourceHost",NetworkPolicy.displayHost(endpoint)).put("note","Known-token contract response, not collection authenticity or contract-standard certification. No approval or transaction sent.");
    }
    public JSONObject tokenUri(String contract,String id,boolean multi)throws Exception {
        contract=address(contract);id=token(id);requireCronos();String block=hex(call("eth_blockNumber",new JSONArray()));String data=(multi?"0x0e89341c":"0xc87b56dd")+word(new BigInteger(id).toString(16));String uri=AbiString.decode(call("eth_call",new JSONArray().put(new JSONObject().put("to",contract).put("data",data)).put(block)));if(multi)uri=uri.replace("{id}",word(new BigInteger(id).toString(16)));return new JSONObject().put("chainId",25).put("contract",contract).put("tokenId",id).put("standard",multi?"ERC-1155":"ERC-721").put("uri",uri).put("block",block).put("sourceHost",NetworkPolicy.displayHost(endpoint)).put("note","URI reported by the selected contract. No off-chain fetch, artwork safety, authenticity or pin retention asserted.");
    }
    public JSONObject receipt(String hash) throws Exception {
        hash=ReadPolicy.hash(hash);requireCronos();Object value=call("eth_getTransactionReceipt",new JSONArray().put(hash));if(value==JSONObject.NULL)return new JSONObject().put("hash",hash).put("state","not-found-or-pending").put("note","No transaction was signed or rebroadcast");
        if(!(value instanceof JSONObject))throw new IOException("Invalid receipt");JSONObject r=(JSONObject)value;if(!hash.equalsIgnoreCase(r.optString("transactionHash")))throw new IOException("Receipt hash mismatch");String blockHash=r.optString("blockHash");if(!blockHash.matches("0x[0-9a-fA-F]{64}"))throw new IOException("Invalid receipt block hash");String status=r.optString("status");if(!status.equals("0x0")&&!status.equals("0x1"))throw new IOException("Receipt status unavailable");JSONObject report=new JSONObject().put("hash",hash.toLowerCase(Locale.ROOT)).put("from",address(r.getString("from"))).put("state",status.equals("0x1")?"included-success":"included-reverted").put("block",hex(r.get("blockNumber"))).put("blockHash",blockHash).put("note","RPC-reported inclusion, not finality or application success; no transaction was rebroadcast");if(r.has("contractAddress")&&!r.isNull("contractAddress"))report.put("contractAddress",address(r.getString("contractAddress")));return report;
    }
}
