import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  Navigation,
  staticClasses,
  Field
} from "@decky/ui";
import {
  addEventListener,
  removeEventListener,
  callable,
  definePlugin,
  toaster,
} from "@decky/api"
import { useState } from "react";
import { FaShip } from "react-icons/fa";

// 1. 对应后端的 add 函数
const add = callable<[first: number, second: number], number>("add");

// 2. 对应后端的 start_timer 函数
const startTimer = callable<[], void>("start_timer");

// 3. 【新增】对应后端新增的 get_system_info 函数（无参数，返回 string）
const getSystemInfo = callable<[], string>("get_system_info");

function Content() {
  const [result, setResult] = useState<number | undefined>();
  
  // 【新增】用于存放系统内核版本的状态
  const [sysInfo, setSysInfo] = useState<string>("点击下方按钮获取系统信息");

  const onClick = async () => {
    const res = await add(Math.random(), Math.random());
    setResult(res);
  };

  // 【新增】点击获取系统信息的处理函数
  const handleGetSysInfo = async () => {
    try {
      const info = await getSystemInfo();
      setSysInfo(info);
    } catch (e) {
      setSysInfo(`获取失败: ${e}`);
    }
  };

  return (
    <PanelSection title="插件测试面板">
      {/* 原有的加法测试按钮 */}
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          onClick={onClick}
        >
          {result !== undefined ? `计算结果: ${result}` : "Add two numbers via Python"}
        </ButtonItem>
      </PanelSectionRow>

      {/* 原有的 Timer 测试按钮 */}
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          onClick={() => startTimer()}
        >
          {"Start Python timer"}
        </ButtonItem>
      </PanelSectionRow>

      {/* 【新增】系统信息展示区域与按钮 */}
      <PanelSectionRow>
        <Field label="系统状态">
          {sysInfo}
        </Field>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          onClick={handleGetSysInfo}
        >
          获取 SteamOS 内核版本
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
};

export default definePlugin(() => {
  console.log("插件初始化, 这在前端启动时会被调用一次")

  // 添加对 "timer_event" 事件的监听
  const listener = addEventListener<[
    test1: string,
    test2: boolean,
    test3: number
  ]>("timer_event", (test1, test2, test3) => {
    console.log("Template got timer_event with:", test1, test2, test3)
    toaster.toast({
      title: "template got timer_event",
      body: `${test1}, ${test2}, ${test3}`
    });
  });

  return {
    name: "Deck-Command-Manager",
	title: "命令管理器",
    titleView: <div className={staticClasses.Title}>命令管理器</div>,
    content: <Content />,
    icon: <FaShip />,
    onDismount() {
      console.log("Unloading")
      removeEventListener("timer_event", listener);
    },
  };
});