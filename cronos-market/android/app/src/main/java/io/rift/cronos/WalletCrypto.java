package io.rift.cronos;
import java.security.SecureRandom;import java.util.Arrays;import org.web3j.crypto.*;
/** BIP39/BIP32 via pinned Web3j primitives; one Cronos EVM account, no signing/network interface. */
public final class WalletCrypto {
 public static final String PATH="m/44'/60'/0'/0/0";private WalletCrypto(){}
 public static byte[] entropy(){byte[] value=new byte[32];new SecureRandom().nextBytes(value);return value;}
 public static String phrase(byte[] entropy){if(entropy.length!=16&&entropy.length!=32)throw new IllegalArgumentException("Only 12/24-word wallets supported");return MnemonicUtils.generateMnemonic(entropy);}
 public static byte[] parse(String phrase){if(phrase==null||phrase.length()>300||!phrase.equals(phrase.trim())||!phrase.matches("[a-z]+(?: [a-z]+){11}|[a-z]+(?: [a-z]+){23}")||!MnemonicUtils.validateMnemonic(phrase))throw new IllegalArgumentException("Enter a valid English 12/24-word BIP39 phrase with single spaces; no extra passphrase supported");byte[] out=MnemonicUtils.generateEntropy(phrase);if(out.length!=16&&out.length!=32)throw new IllegalArgumentException("Unsupported phrase");return out;}
 public static String address(byte[] entropy){String mnemonic=phrase(entropy);byte[] seed=MnemonicUtils.generateSeed(mnemonic,"");try{int h=Bip32ECKeyPair.HARDENED_BIT;Bip32ECKeyPair key=Bip32ECKeyPair.deriveKeyPair(Bip32ECKeyPair.generateKeyPair(seed),new int[]{44|h,60|h,0|h,0,0});return Keys.toChecksumAddress("0x"+Keys.getAddress(key));}finally{Arrays.fill(seed,(byte)0);/* Library immutable Strings/BigIntegers cannot be reliably zeroized. */}}
}
