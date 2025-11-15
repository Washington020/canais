#!/usr/bin/env python3
import qrcode
import sys

# URL do Expo baseado no preview URL
preview_url = "https://gymaccess-1.preview.emergentagent.com"
expo_url = f"exp://{preview_url.replace('https://', '').replace('http://', '')}"

print(f"\n{'='*60}")
print(f"🎯 EXPO GO - URL para Conexão")
print(f"{'='*60}")
print(f"\n📱 URL do Expo: {expo_url}")
print(f"\n{'='*60}\n")

# Criar QR Code
qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_L,
    box_size=10,
    border=4,
)
qr.add_data(expo_url)
qr.make(fit=True)

# Imprimir QR Code no terminal
qr.print_ascii()

print(f"\n{'='*60}")
print(f"📱 INSTRUÇÕES:")
print(f"{'='*60}")
print(f"1. Instale o Expo Go no seu celular")
print(f"2. Abra o Expo Go")
print(f"3. Escaneie o QR Code acima")
print(f"4. OU digite manualmente: {expo_url}")
print(f"{'='*60}\n")

# Salvar QR Code como imagem
img = qr.make_image(fill_color="black", back_color="white")
output_path = "/app/frontend/expo_qr_code.png"
img.save(output_path)
print(f"✅ QR Code salvo em: {output_path}\n")
