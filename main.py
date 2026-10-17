import os
import json
import decky
import asyncio
import subprocess

SETTINGS_DIR = os.environ.get("DECKY_PLUGIN_SETTINGS_DIR", os.path.dirname(__file__))
CONFIG_FILE = os.path.join(SETTINGS_DIR, "commands.json")

class Plugin:
    async def get_commands(self) -> list:
        try:
            if os.path.exists(CONFIG_FILE):
                with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            return []
        except Exception as e:
            decky.logger.error(f"读取命令失败: {e}")
            return []

    async def save_commands(self, commands: list) -> bool:
        try:
            os.makedirs(SETTINGS_DIR, exist_ok=True)
            with open(CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump(commands, f, ensure_ascii=False, indent=4)
            return True
        except Exception as e:
            decky.logger.error(f"保存命令失败: {e}")
            return False

    async def copy_to_clipboard(self, text: str) -> bool:
        # 1. 强行指定 SteamOS 的用户运行环境 (deck 用户 UID=1000)
        env = os.environ.copy()
        env["XDG_RUNTIME_DIR"] = "/run/user/1000"
        env["WAYLAND_DISPLAY"] = env.get("WAYLAND_DISPLAY", "wayland-0")
        env["DISPLAY"] = env.get("DISPLAY", ":0")

        # 方式 1：利用 sudo -u deck 附带完整的 XDG 运行目录调用 wl-copy
        try:
            cmd = f'export XDG_RUNTIME_DIR=/run/user/1000; export WAYLAND_DISPLAY=wayland-0; wl-copy "{text}"'
            res = subprocess.run(['sudo', '-u', 'deck', 'bash', '-c', cmd], capture_output=True, text=True, timeout=3)
            if res.returncode == 0:
                decky.logger.info("方式1: sudo -u deck wl-copy 成功")
                return True
        except Exception as e:
            decky.logger.warn(f"方式1 失败: {e}")

        # 方式 2：使用管道直接写入 wl-copy
        try:
            p = subprocess.Popen(['wl-copy'], stdin=subprocess.PIPE, env=env)
            p.communicate(input=text.encode('utf-8'), timeout=3)
            if p.returncode == 0:
                decky.logger.info("方式2: wl-copy 管道写入成功")
                return True
        except Exception as e:
            decky.logger.warn(f"方式2 失败: {e}")

        # 方式 3：使用 xclip (针对桌面模式/XWayland)
        try:
            p = subprocess.Popen(['xclip', '-selection', 'clipboard'], stdin=subprocess.PIPE, env=env)
            p.communicate(input=text.encode('utf-8'), timeout=3)
            if p.returncode == 0:
                decky.logger.info("方式3: xclip 管道写入成功")
                return True
        except Exception as e:
            decky.logger.warn(f"方式3 失败: {e}")

        # 方式 4：使用 Python 内置的终端控制台回退逻辑 (通过环境变量传回前端或写入临时文件)
        try:
            clip_file = "/tmp/deck_command_manager_clipboard.txt"
            with open(clip_file, "w", encoding="utf-8") as f:
                f.write(text)
            decky.logger.info(f"方式4: 写入临时剪贴板文件 {clip_file}")
            return True
        except Exception as e:
            decky.logger.warn(f"方式4 失败: {e}")

        decky.logger.error("所有复制方式均失败")
        return False

    async def _main(self):
        decky.logger.info("文本管理器后端已启动！")

    async def _unload(self):
        pass