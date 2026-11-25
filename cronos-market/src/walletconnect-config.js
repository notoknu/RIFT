// Public application identifier, not a wallet secret or authorization token.
export const PUBLIC_REOWN_PROJECT_ID='6192620197a83e8b29a98f8eb68ecc89';
export function walletConnectProjectId(override){
 const value=override===undefined?PUBLIC_REOWN_PROJECT_ID:String(override).trim();
 if(value!==''&&!/^[a-f0-9]{32}$/i.test(value))throw Error('Invalid public Reown project ID');
 return value;
}
