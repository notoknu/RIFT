package io.rift.cronos;
import org.junit.Test;import static org.junit.Assert.*;import java.util.*;
/** Public deterministic test vectors only. NEVER fund derived test-vector addresses. */
public final class WalletCryptoTest {
 @Test public void known12WordVectorMatchesIndependentEthersDerivation(){byte[] zero=new byte[16];assertEquals("abandon ".repeat(11)+"about",WalletCrypto.phrase(zero));assertEquals("0x9858EfFD232B4033E47d90003D41EC34EcaEda94",WalletCrypto.address(zero));assertArrayEquals(zero,WalletCrypto.parse(WalletCrypto.phrase(zero)));}
 @Test public void known24WordVectorMatchesIndependentEthersDerivation(){byte[] zero=new byte[32];assertEquals("abandon ".repeat(23)+"art",WalletCrypto.phrase(zero));assertEquals("0xF278cF59F82eDcf871d630F28EcC8056f25C1cdb",WalletCrypto.address(zero));assertArrayEquals(zero,WalletCrypto.parse(WalletCrypto.phrase(zero)));}
 @Test public void invalidPhraseChecksumWhitespaceLengthAndUnknownWordsAreRejected(){for(String phrase:new String[]{"abandon ".repeat(11)+"abandon","abandon ".repeat(10)+"about"," abandon ".repeat(12),"abandon ".repeat(11)+"unknownword","abandon ".repeat(11)+"ABOUT","abandon ".repeat(11)+"about ","x".repeat(301)})try{WalletCrypto.parse(phrase);fail();}catch(IllegalArgumentException expected){}}
 @Test public void entropyLengthBoundsAreEnforced(){for(int n:new int[]{0,15,17,20,24,28,31,33})try{WalletCrypto.phrase(new byte[n]);fail();}catch(IllegalArgumentException expected){}}
 @Test public void generatedEntropyHas256BitsAndRoundTrips(){byte[] a=WalletCrypto.entropy(),b=WalletCrypto.entropy();try{assertEquals(32,a.length);assertFalse(Arrays.equals(a,b));assertArrayEquals(a,WalletCrypto.parse(WalletCrypto.phrase(a)));assertEquals(24,WalletCrypto.phrase(a).split(" ").length);}finally{Arrays.fill(a,(byte)0);Arrays.fill(b,(byte)0);}}
}
