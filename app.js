// Pastikan ekstensi Freighter terinstal di browser kamu
import { isConnected, getPublicKey, signTransaction } from "https://cdn.jsdelivr.net/npm/@stellar/freighter-api@latest/dist/index.min.js";

const connectBtn = document.getElementById("connectBtn");
const walletInfo = document.getElementById("walletInfo");
const publicKeyText = document.getElementById("publicKeyText");
const balanceText = document.getElementById("balanceText");
const tipSection = document.getElementById("tipSection");
const sendBtn = document.getElementById("sendBtn");
const amountInput = document.getElementById("amountInput");
const statusDiv = document.getElementById("status");

let userPublicKey = "";

// 1. Fungsi Koneksi Wallet
connectBtn.addEventListener("click", async () => {
    try {
        const connected = await isConnected();
        if (!connected) {
            statusDiv.style.color = "red";
            statusDiv.innerText = "Freighter wallet tidak ditemukan! Pasang ekstensinya dulu.";
            return;
        }

        userPublicKey = await getPublicKey();
        if (userPublicKey) {
            publicKeyText.innerText = userPublicKey;
            walletInfo.style.display = "block";
            tipSection.style.display = "block";
            connectBtn.innerText = "Wallet Connected ✅";
            connectBtn.disabled = true;

            // Ambil saldo akun di Testnet
            await fetchBalance(userPublicKey);
        }
    } catch (error) {
        console.error(error);
        statusDiv.style.color = "red";
        statusDiv.innerText = "Gagal menyambungkan wallet.";
    }
});

// 2. Fungsi Mengambil Saldo (Balance Handling)
async function fetchBalance(publicKey) {
    try {
        const server = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");
        const account = await server.loadAccount(publicKey);
        
        let xlmBalance = "0";
        account.balances.forEach((balance) => {
            if (balance.asset_type === "native") {
                xlmBalance = balance.balance;
            }
        });
        balanceText.innerText = xlmBalance;
    } catch (error) {
        console.error("Gagal memuat saldo:", error);
        balanceText.innerText = "Gagal memuat (Pastikan akun sudah di-fund testnet XLM)";
    }
}

// 3. Fungsi Kirim Transaksi XLM (Transaction Flow)
sendBtn.addEventListener("click", async () => {
    const amount = amountInput.value;
    if (!amount || amount <= 0) {
        statusDiv.style.color = "red";
        statusDiv.innerText = "Masukkan jumlah XLM yang valid!";
        return;
    }

    statusDiv.style.color = "blue";
    statusDiv.innerText = "Memproses transaksi ke jaringan Testnet...";

    try {
        const server = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");
        
        // Alamat tujuan (Contoh: Kamu bisa arahkan ke alamat wallet kamu sendiri yang lain untuk testing)
        const destinationId = "GAJTQD44IUYUZM4JU3YAKDN6R75M246YLGF43SP7NV55L37DZJXG2J6G"; 

        const sourceAccount = await server.loadAccount(userPublicKey);
        
        // Buat transaksi pembayaran XLM
        const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: StellarSdk.Networks.TESTNET,
        })
            .addOperation(
                StellarSdk.Operation.payment({
                    destination: destinationId,
                    asset: StellarSdk.Asset.native(),
                    amount: amount,
                })
            )
            .setTimeout(30)
            .build();

        // Minta tanda tangan (sign) dari Freighter Wallet
        const signedTxXdr = await signTransaction(transaction.toXDR(), { network: "TESTNET" });
        
        // Kirim transaksi ke jaringan Stellar Testnet
        const txer = new StellarSdk.Transaction(signedTxXdr, StellarSdk.Networks.TESTNET);
        const response = await server.submitTransaction(txer);

        statusDiv.style.color = "green";
        statusDiv.innerHTML = `Transaksi Berhasil! 🎉<br>Hash: <a href="https://stellar.expert/explorer/testnet/tx/${response.hash}" target="_blank">${response.hash.substring(0, 15)}...</a>`;
        
        // Refresh saldo setelah kirim
        await fetchBalance(userPublicKey);

    } catch (error) {
        console.error(error);
        statusDiv.style.color = "red";
        statusDiv.innerText = "Transaksi Gagal: " + (error.message || error);
    }
});