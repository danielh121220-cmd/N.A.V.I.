import argparse
import datetime
import hashlib
import os
import shutil
import struct
import subprocess
import sys
import tempfile
import zipfile
import zlib

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.x509.oid import NameOID

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
APP = os.path.join(ROOT, 'android', 'app', 'src', 'main')
PACKAGE = 'ec.navi.app'
VERSION_CODE = "6"
VERSION_NAME = "3.5"


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.stderr.write(r.stdout + r.stderr)
        raise SystemExit('Falló: ' + ' '.join(cmd[:3]))
    return r.stdout


def key_and_cert(path):
    if os.path.exists(path):
        data = open(path, 'rb').read()
        key = serialization.load_pem_private_key(data, None)
        cert = x509.load_pem_x509_certificate(data)
        return key, cert
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, 'NAVI'), x509.NameAttribute(NameOID.ORGANIZATION_NAME, 'N.A.V.I'), x509.NameAttribute(NameOID.COUNTRY_NAME, 'EC')])
    now = datetime.datetime(2026, 1, 1, tzinfo=datetime.timezone.utc)
    cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key())
            .serial_number(x509.random_serial_number()).not_valid_before(now)
            .not_valid_after(now + datetime.timedelta(days=365 * 30)).sign(key, hashes.SHA256()))
    with open(path, 'wb') as f:
        f.write(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
        f.write(cert.public_bytes(serialization.Encoding.PEM))
    return key, cert


def write_aligned_zip(entries, out):
    buf = bytearray()
    central = bytearray()
    dos_time, dos_date = 0, (2026 - 1980) << 9 | 1 << 5 | 1
    for name, data, store in entries:
        nb = name.encode('utf-8')
        crc = zlib.crc32(data) & 0xffffffff
        if store:
            comp, method = data, 0
        else:
            c = zlib.compressobj(9, zlib.DEFLATED, -15)
            comp, method = c.compress(data) + c.flush(), 8
        offset = len(buf)
        extra = b''
        if method == 0:
            pad = (4 - (offset + 30 + len(nb)) % 4) % 4
            extra = b'\x00' * pad
        buf += struct.pack('<IHHHHHIIIHH', 0x04034b50, 20, 0x0800, method, dos_time, dos_date, crc, len(comp), len(data), len(nb), len(extra)) + nb + extra + comp
        central += struct.pack('<IHHHHHHIIIHHHHHII', 0x02014b50, 20, 20, 0x0800, method, dos_time, dos_date, crc, len(comp), len(data), len(nb), 0, 0, 0, 0, 0, offset) + nb
    cd_offset = len(buf)
    eocd = struct.pack('<IHHHHIIH', 0x06054b50, 0, 0, len(entries), len(entries), len(central), cd_offset, 0)
    with open(out, 'wb') as f:
        f.write(bytes(buf) + bytes(central) + eocd)


def lp(b):
    return struct.pack('<I', len(b)) + b


def chunk_digest(parts):
    digests = []
    for part in parts:
        for i in range(0, len(part), 1 << 20):
            c = part[i:i + (1 << 20)]
            digests.append(hashlib.sha256(b'\xa5' + struct.pack('<I', len(c)) + c).digest())
    return hashlib.sha256(b'\x5a' + struct.pack('<I', len(digests)) + b''.join(digests)).digest()


def sign_v2(path, key, cert):
    data = open(path, 'rb').read()
    eocd_at = data.rfind(b'PK\x05\x06')
    cd_size, cd_offset = struct.unpack('<II', data[eocd_at + 12:eocd_at + 20])
    entries = data[:cd_offset]
    central = data[cd_offset:cd_offset + cd_size]
    eocd = data[eocd_at:]
    digest = chunk_digest([entries, central, eocd])
    algo = 0x0103
    cert_der = cert.public_bytes(serialization.Encoding.DER)
    signed = lp(lp(struct.pack('<I', algo) + lp(digest))) + lp(lp(cert_der)) + lp(b'')
    sig = key.sign(signed, padding.PKCS1v15(), hashes.SHA256())
    spki = key.public_key().public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
    signer = lp(signed) + lp(lp(struct.pack('<I', algo) + lp(sig))) + lp(spki)
    value = lp(lp(signer))
    pair = struct.pack('<QI', len(value) + 4, 0x7109871a) + value
    size = len(pair) + 8 + 16
    block = struct.pack('<Q', size) + pair + struct.pack('<Q', size) + b'APK Sig Block 42'
    new_eocd = eocd[:16] + struct.pack('<I', cd_offset + len(block)) + eocd[20:]
    with open(path, 'wb') as f:
        f.write(entries + block + central + new_eocd)
    return digest


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--android-jar', required=True)
    ap.add_argument('--aapt2', required=True)
    ap.add_argument('--dx', required=True)
    ap.add_argument('--out', default=os.path.join(ROOT, 'NAVI.apk'))
    a = ap.parse_args()
    work = tempfile.mkdtemp(prefix='navi-apk-')
    try:
        manifest = open(os.path.join(APP, 'AndroidManifest.xml'), encoding='utf-8').read()
        manifest = manifest.replace('<manifest xmlns:android="http://schemas.android.com/apk/res/android">', f'<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="{PACKAGE}">', 1)
        mpath = os.path.join(work, 'AndroidManifest.xml')
        open(mpath, 'w', encoding='utf-8').write(manifest)
        res_zip = os.path.join(work, 'res.zip')
        run([a.aapt2, 'compile', '--dir', os.path.join(APP, 'res'), '-o', res_zip])
        base = os.path.join(work, 'base.apk')
        run([a.aapt2, 'link', '-I', a.android_jar, '--manifest', mpath, '--min-sdk-version', '24', '--target-sdk-version', '34',
             '--version-code', VERSION_CODE, '--version-name', VERSION_NAME, '-A', os.path.join(APP, 'assets'), '-o', base, res_zip])
        classes = os.path.join(work, 'classes')
        os.makedirs(classes)
        sources = []
        for d, _, files in os.walk(os.path.join(APP, 'java')):
            sources += [os.path.join(d, f) for f in files if f.endswith('.java')]
        run(['javac', '-nowarn', '-encoding', 'UTF-8', '-source', '8', '-target', '8', '-bootclasspath', a.android_jar, '-d', classes] + sources)
        dex = os.path.join(work, 'classes.dex')
        run(['java', '-jar', a.dx, '--dex', '--min-sdk-version=24', '--output=' + dex, classes])
        entries = []
        with zipfile.ZipFile(base) as z:
            names = z.namelist()
            names.sort(key=lambda n: (n != 'AndroidManifest.xml', n))
            for n in names:
                data = z.read(n)
                store = n == 'resources.arsc' or n.endswith('.png') or z.getinfo(n).compress_type == 0
                entries.append((n, data, store))
        entries.insert(1, ('classes.dex', open(dex, 'rb').read(), False))
        unsigned = os.path.join(work, 'app.apk')
        write_aligned_zip(entries, unsigned)
        key, cert = key_and_cert(os.path.join(HERE, 'clave-de-prueba.pem'))
        sign_v2(unsigned, key, cert)
        shutil.copy(unsigned, a.out)
        print('APK listo:', a.out, os.path.getsize(a.out), 'bytes')
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == '__main__':
    main()
