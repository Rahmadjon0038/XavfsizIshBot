#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

if [[ ! -s .env ]] || ! grep -Eq '^[[:space:]]*BOT_TOKEN[[:space:]]*=[[:space:]]*[^[:space:]#]+' .env; then
  printf '%s\n' 'Avval .env faylida BOT_TOKEN qiymatini sozlang.' >&2
  exit 1
fi

root=()
if (( EUID != 0 )); then
  root=(sudo)
fi

if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  if [[ ! -r /etc/os-release ]] || ! command -v apt-get >/dev/null 2>&1; then
    printf '%s\n' 'Docker va Compose plaginini o‘rnating, so‘ng deploy.sh ni qayta ishga tushiring.' >&2
    exit 1
  fi

  # shellcheck source=/dev/null
  . /etc/os-release
  case "${ID:-}" in
    ubuntu) suite="${UBUNTU_CODENAME:-${VERSION_CODENAME:-}}" ;;
    debian) suite="${VERSION_CODENAME:-}" ;;
    *) printf '%s\n' 'Avtomatik Docker o‘rnatish Ubuntu va Debian uchun.' >&2; exit 1 ;;
  esac
  if [[ -z "$suite" ]]; then
    printf '%s\n' 'Linux distributivi versiyasini aniqlab bo‘lmadi.' >&2
    exit 1
  fi

  "${root[@]}" apt-get update
  "${root[@]}" apt-get install -y ca-certificates curl
  "${root[@]}" install -m 0755 -d /etc/apt/keyrings
  "${root[@]}" curl -fsSL "https://download.docker.com/linux/$ID/gpg" -o /etc/apt/keyrings/docker.asc
  "${root[@]}" chmod a+r /etc/apt/keyrings/docker.asc
  printf 'Types: deb\nURIs: https://download.docker.com/linux/%s\nSuites: %s\nComponents: stable\nArchitectures: %s\nSigned-By: /etc/apt/keyrings/docker.asc\n' \
    "$ID" "$suite" "$(dpkg --print-architecture)" | "${root[@]}" tee /etc/apt/sources.list.d/xavfsizishbot-docker.sources >/dev/null
  "${root[@]}" apt-get update
  if command -v docker >/dev/null 2>&1; then
    "${root[@]}" apt-get install -y docker-compose-plugin
  else
    "${root[@]}" apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  fi
fi

docker_cmd=(docker)
if ! docker info >/dev/null 2>&1; then
  if command -v systemctl >/dev/null 2>&1 && ! systemctl is-active --quiet docker; then
    "${root[@]}" systemctl enable --now docker
  fi
  if ! docker info >/dev/null 2>&1; then
    docker_cmd=("${root[@]}" docker)
  fi
fi

"${docker_cmd[@]}" compose up -d --build --wait --wait-timeout 90
"${docker_cmd[@]}" compose ps
