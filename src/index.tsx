import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  staticClasses,
  Field,
  TextField
} from "@decky/ui";
import {
  callable,
  definePlugin,
  toaster,
} from "@decky/api";
import { useState, useEffect } from "react";
import { FaShip } from "react-icons/fa";

// 定义条目数据结构
interface CommandItem {
  id: string;
  name: string;
  command: string;
}

// 绑定后端的 callable 方法
const getCommands = callable<[], CommandItem[]>("get_commands");
const saveCommands = callable<[commands: CommandItem[]], boolean>("save_commands");
const copyToClipboard = callable<[text: string], boolean>("copy_to_clipboard");

function Content() {
  const [commands, setCommands] = useState<CommandItem[]>([]);
  // 视图状态: "list" (主列表页), "form" (添加/编辑表单页), "detail" (条目详情操作页)
  const [currentView, setCurrentView] = useState<"list" | "form" | "detail">("list");
  const [selectedItem, setSelectedItem] = useState<CommandItem | null>(null);

  // 表单状态
  const [formName, setFormName] = useState<string>("");
  const [formCmd, setFormCmd] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // 初始化加载持久化数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await getCommands();
      setCommands(res || []);
    } catch (e) {
      toaster.toast({ title: "错误", body: `加载失败: ${e}` });
    }
  };

  // 数据持久化写回
  const persistAndSet = async (newCommands: CommandItem[]) => {
    setCommands(newCommands);
    const success = await saveCommands(newCommands);
    if (!success) {
      toaster.toast({ title: "警告", body: "持久化保存失败！" });
    }
  };

  // 打开“添加新条目”表单
  const handleOpenAddForm = () => {
    setFormName("");
    setFormCmd("");
    setIsEditing(false);
    setCurrentView("form");
  };

  // 点击条目进入详情页
  const handleSelectItem = (item: CommandItem) => {
    setSelectedItem(item);
    setCurrentView("detail");
  };

  // 保存表单（新增/修改）
  const handleSaveForm = async () => {
    if (!formName.trim() || !formCmd.trim()) {
      toaster.toast({ title: "提示", body: "名称和具体内容不能为空！" });
      return;
    }

    if (isEditing && selectedItem) {
      const updated = commands.map(item =>
        item.id === selectedItem.id ? { ...item, name: formName, command: formCmd } : item
      );
      await persistAndSet(updated);
      toaster.toast({ title: "成功", body: "修改已保存" });
    } else {
      const newItem: CommandItem = {
        id: Date.now().toString(),
        name: formName,
        command: formCmd
      };
      await persistAndSet([...commands, newItem]);
      toaster.toast({ title: "成功", body: "新条目已保存" });
    }

    setCurrentView("list");
  };

  // 取消表单
  const handleCancelForm = () => {
    setCurrentView(selectedItem && isEditing ? "detail" : "list");
  };

  // 打开“重新编辑”表单
  const handleOpenEditForm = () => {
    if (!selectedItem) return;
    setFormName(selectedItem.name);
    setFormCmd(selectedItem.command);
    setIsEditing(true);
    setCurrentView("form");
  };

  // 删除指定条目
  const handleDeleteItem = async (id: string) => {
    const updated = commands.filter(item => item.id !== id);
    await persistAndSet(updated);
    toaster.toast({ title: "提示", body: "条目已删除" });
    setCurrentView("list");
  };

  // 核心复制函数：三重兼容保障（适合 SteamOS GameMode 特殊环境）
  const handleCopy = async (cmd: string) => {
    // 方式 1：优先尝试前端网页内核的传统 DOM execCommand 复制操作（在 CEF 沙盒中响应最直接）
    try {
      const input = document.createElement("textarea");
      input.value = cmd;
      input.style.position = "fixed";
      input.style.left = "-9999px";
      input.style.top = "-9999px";
      document.body.appendChild(input);
      input.focus();
      input.select();
      
      const successful = document.execCommand("copy");
      document.body.removeChild(input);

      if (successful) {
        toaster.toast({ title: "复制成功", body: "已成功复制到剪贴板！" });
        return;
      }
    } catch (e) {
      console.log("前端 DOM 复制失败，尝试后端系统级写入", e);
    }

    // 方式 2：回退到 Python 后端唤起系统的 Wayland/X11 剪贴板进程
    try {
      const backendSuccess = await copyToClipboard(cmd);
      if (backendSuccess) {
        toaster.toast({ title: "复制成功", body: "已成功复制到剪贴板！" });
        return;
      }
    } catch (e) {
      console.log("后端复制执行失败", e);
    }

    // 方式 3：异步 Clipboard API 兜底
    try {
      await navigator.clipboard.writeText(cmd);
      toaster.toast({ title: "复制成功", body: "已成功复制到剪贴板！" });
    } catch (err) {
      toaster.toast({ title: "复制失败", body: "系统限制，无法写入剪贴板" });
    }
  };

  // ================= 视图 1：主列表界面 =================
  if (currentView === "list") {
    return (
      <PanelSection title="命令管理器">
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={handleOpenAddForm}>
            ➕ 添加命令/文本条目
          </ButtonItem>
        </PanelSectionRow>

        {commands.length > 0 && (
          <PanelSection title="已保存的条目">
            {commands.map((item) => (
              <PanelSectionRow key={item.id}>
                <ButtonItem layout="below" onClick={() => handleSelectItem(item)}>
                  {item.name}
                </ButtonItem>
              </PanelSectionRow>
            ))}
          </PanelSection>
        )}
      </PanelSection>
    );
  }

  // ================= 视图 2：全屏编辑/添加表单界面 =================
  if (currentView === "form") {
    return (
      <PanelSection title={isEditing ? "编辑条目内容" : "添加新条目"}>
        <PanelSectionRow>
          <TextField
            label="条目名称"
            value={formName}
            onChange={(e: any) => setFormName(e.target.value)}
            placeholder="点击输入名称（自动弹出虚拟键盘）"
          />
        </PanelSectionRow>

        <PanelSectionRow>
          <TextField
            label="条目具体内容 / 文本"
            value={formCmd}
            onChange={(e: any) => setFormCmd(e.target.value)}
            placeholder="点击输入命令或多行文本"
          />
        </PanelSectionRow>

        <PanelSectionRow>
          <ButtonItem layout="below" onClick={handleSaveForm}>
            💾 保存
          </ButtonItem>
        </PanelSectionRow>

        <PanelSectionRow>
          <ButtonItem layout="below" onClick={handleCancelForm}>
            ❌ 取消 (不保存)
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    );
  }

  // ================= 视图 3：条目详情及操作界面 =================
  return (
    <PanelSection title={`【${selectedItem?.name}】`}>
      <PanelSectionRow>
        <Field label="内容预览">
          <div style={{ 
            wordBreak: "break-all", 
            whiteSpace: "pre-wrap", 
            fontSize: "12px", 
            color: "#ddd",
            maxHeight: "150px",
            overflowY: "auto",
            background: "#1e1f22",
            padding: "8px",
            borderRadius: "4px"
          }}>
            {selectedItem?.command}
          </div>
        </Field>
      </PanelSectionRow>

      <PanelSectionRow>
        <ButtonItem layout="below" onClick={() => handleCopy(selectedItem!.command)}>
          📋 复制内容到剪贴板
        </ButtonItem>
      </PanelSectionRow>

      <PanelSectionRow>
        <ButtonItem layout="below" onClick={handleOpenEditForm}>
          ✏️ 重新编辑
        </ButtonItem>
      </PanelSectionRow>

      <PanelSectionRow>
        <ButtonItem layout="below" onClick={() => handleDeleteItem(selectedItem!.id)}>
          🗑️ 删除条目
        </ButtonItem>
      </PanelSectionRow>

      <PanelSectionRow>
        <ButtonItem layout="below" onClick={() => setCurrentView("list")}>
          🔙 返回列表
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
}

export default definePlugin(() => {
  return {
    name: "Deck-Command-Manager",
    title: "命令管理器",
    titleView: <div className={staticClasses.Title}>命令管理器</div>,
    content: <Content />,
    icon: <FaShip />,
  };
});