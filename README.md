# HTCI — Monitoring Pembakaran

Website statis: buka melalui server lokal atau hosting statis. Firebase dikonfigurasi di `firebase-config.js`.

## Perubahan

- Label status Online/Offline alat dihapus.
- PM2.5: partikel debu halus; CH4: kadar gas metana; MQ135: indikator kualitas udara; MQ4: indikator gas metana.
- Kartu Gas Quality Index dihapus; ringkasan Kualitas Gas dipertahankan.
- Nama alat dipertebal. Tambah, edit, dan hapus alat hanya tersedia untuk admin.
- Peran berasal dari sesi Firebase Auth dan `users/<uid>/role = "admin"`, atau custom claim `admin: true`. Nama akun tidak menentukan hak admin.
- Login memperbarui data akun tanpa menimpa peran maupun daftar alat.
- Penambahan, perubahan, dan penghapusan alat tersimpan di Realtime Database.

## Aturan akses Firebase

`database-access.rules.json` menyediakan aturan untuk users, deviceLinks, dan loginHistory. Gabungkan node tersebut dengan aturan Realtime Database yang sudah dipakai, lalu publikasikan melalui Firebase Console. Pertahankan aturan node telemetri HTC_Incinerator agar perangkat sensor tetap dapat mengirim data. Berkas ini belum diterapkan otomatis ke Firebase.

Atur role akun admin pertama melalui Firebase Console atau Admin SDK. Pengguna biasa tidak boleh dapat mengubah role atau menulis deviceLinks maupun users/<uid>/api. Pembatasan antarmuka sudah aktif; pembatasan permintaan langsung ke database memerlukan aturan tersebut dipublikasikan.

## Pemeriksaan

Pemeriksaan sintaks JavaScript dan pengujian browser dengan Firebase tiruan lulus untuk user/admin, penambahan serta edit alat, label sensor, font tebal, dan tampilan seluler 390px. Pengujian ini tidak mengubah data Firebase produksi.
