import {Command} from 'commander'
import {DirectSecp256k1HdWallet} from '@cosmjs/proto-signing'
import {promises} from 'fs'
import {SigningCosmWasmClient} from '@cosmjs/cosmwasm-stargate'

const program = new Command()

program.name('cosmos-wallet')
  .description('cosmos-wallet cli')
  .version('0.0.1')

program.command('generate')
  .description('generate new mnemonic, public_key and address')
  .option('-h, --hrp <string>', 'human readable prefix (default: wasm)', 'wasm')
  .option('-e, --export <string>', 'export filename')
  .action(async (options) => {
    const mnemonic = (await DirectSecp256k1HdWallet.generate(12)).mnemonic
    const [account] = await (await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {prefix: options.hrp})).getAccounts()
    const keys = {
      mnemonic,
      public_key: Buffer.from(account.pubkey).toString('hex'),
      address: account.address
    }

    console.log(keys)

    if (options.export) {
      const file_name: string = options.export
      await promises.writeFile(file_name.endsWith('.key') ? file_name : `${file_name}.key`, JSON.stringify(keys, null, '\t'))
    }
  })
  
program.command('transfer')
  .description('transfer tokens')
  .requiredOption('-k, --key <string>', 'key filename')
  .requiredOption('-r, --recipient <string>', 'recipient address')
  .requiredOption('-a, --amount <number>')
  .option('-e, --endpoint <string>', 'node endpoint (default: http://localhost:26657)', 'http://localhost:26657')
  .option('-h, --hrp <string>', 'human readable prefix (default: wasm)', 'wasm')
  .action(async (options) => {
    const key = JSON.parse((await promises.readFile(options.key)).toString())
    const mnemonic = key.mnemonic
    const address = key.address
    if (!mnemonic) {
      console.error('invalid key type; key does not include mnemonic')
      return
    }
    if (!address) {
      console.error('invalid key type; key does not include address')
      return
    }
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {prefix: options.hrp})
    const client = await SigningCosmWasmClient.connectWithSigner(options.endpoint, wallet)
    const fee = {
      amount: [
        {amount: '2000', denom: 'ucosm'}
      ],
      gas: '200000'
    }
    const result = await client.sendTokens(address, options.recipient, [{amount: options.amount, denom: 'ucosm'}], fee)
    console.log({result})
  })

program.parse()