using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Runtime.InteropServices;
using Microsoft.Win32;
using System.IO;
using System.Threading;


//using System.Windows.Forms;

namespace HelloWorld
{
    class Hello
    {
        static void Main(string[] args)
        {

            //Console.WriteLine(args[0]);
            Console.OutputEncoding = Encoding.UTF8;
            string myPath = Atlas.GetInstallPath();
            if (myPath == null) {
                Console.WriteLine("Atlas installation path not found!");
            }
            //Console.WriteLine(myPath);
            if (Atlas.Initialize(myPath))
            {
                // determining input by -t args
                int txtArgIndex = Array.IndexOf(args, "-t");
                if (txtArgIndex != -1)
                {
                    //Console.WriteLine("Text arguments found");

                    //List<string> textList = new List<string>();
                    if (Array.IndexOf(args, "-n") == -1){
                        for (int i = txtArgIndex + 1; i < args.Length; i++)
                        {
                            Console.WriteLine(Atlas.Translate(args[i]));
                            //textList.Add(args[i]);
                        }
                    } else {
                        for (int i = txtArgIndex + 1; i < args.Length; i++)
                        {
                            string[] splitted = args[i].Split('\n');
                            for (var z = 0; z < splitted.Length; z++)
                            {
                               Console.WriteLine( Atlas.Translate(splitted[z]));
                            }
                            //Console.WriteLine(Atlas.Translate(args[i]));
                            //textList.Add(args[i]);
                            Console.WriteLine("[EOL]");
                        }                        

                    }
                    //string[] textInputs = textList.ToArray();
                    //string textInput = textInputs.Join(" ");



                    //string[] myText = args.Skip(txtArgIndex+1).ToArray();
                    //string inputText = String.Join(". ", myText);
                    //Console.WriteLine(Atlas.Translate(inputText));

                }
                else
                {
                    Console.WriteLine("Atlas console translator");
                    Console.WriteLine("Ver 0.2");
                    Console.WriteLine("@2018 By. Dreamsavior");
                    Console.WriteLine("dreamsavior@gmail.com");
                    Console.WriteLine("Credits to : Chiitrans project");
                    Console.WriteLine("https://github.com/alexbft/chiitrans/");
                    Console.WriteLine("========================================");
                    Console.WriteLine("");
                    Console.WriteLine("Command : ");
                    Console.WriteLine("   Atlas [OPTIONAL PARAM] -t [your text here]");
                    Console.WriteLine("Required arguments : -t");
                    Console.WriteLine("");
                    Console.WriteLine("OPTIONAL PARAM :");
                    Console.WriteLine("   -n     : give [EOL] at the end of each result");
                }
                /*
                Console.WriteLine("=====================");
                Console.WriteLine(args[0]);
                string tran = Atlas.Translate(args[0]);
                Console.WriteLine(tran);
                */
                //Console.WriteLine("Press any key to exit.");
                //Console.ReadKey();
                     
            }
            else
            {
                Console.WriteLine("Failed to initialize Atlas");
            }



            // Keep the console window open in debug mode.


        }
    }
    class PInvokeFunc
    {

        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        public static extern short GetAsyncKeyState(int key);

        /*
        public static bool IsKeyDown(Keys key)
        {
            short value = GetAsyncKeyState((int)key);
            return ((value & -2) != 0);
        }
         * */

        [DllImport("kernel32.dll", CharSet = CharSet.Ansi, SetLastError = true)]
        //[DllImport("kernel32.dll", SetLastError = true)]
        public static extern IntPtr LoadLibraryEx(string lpFileName, IntPtr hFile, uint dwFlags);

        [DllImport("kernel32.dll", CharSet = CharSet.Ansi, SetLastError = true)]
        //[DllImport("kernel32.dll", SetLastError = true)]
        public static extern IntPtr LoadLibrary(string lpFileName);

        public const uint LOAD_LIBRARY_AS_DATAFILE = 0x00000002;
        public const uint DONT_RESOLVE_DLL_REFERENCES = 0x00000001;
        public const uint LOAD_WITH_ALTERED_SEARCH_PATH = 0x00000008;
        public const uint LOAD_IGNORE_CODE_AUTHZ_LEVEL = 0x00000010;
        public const uint LOAD_LIBRARY_AS_DATAFILE_EXCLUSIVE = 0x00000040;

        [DllImport("kernel32.dll", CharSet = CharSet.Ansi, ExactSpelling = true, SetLastError = true)]
        public static extern IntPtr GetProcAddress(IntPtr hModule, string procName);

        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern bool FreeLibrary(IntPtr hModule);

        [DllImport("user32.dll")]
        public static extern bool EnumDesktopWindows(IntPtr hDesktop,
            EnumDesktopWindowsDelegate lpfn, IntPtr lParam);

        public delegate bool EnumDesktopWindowsDelegate(IntPtr hWnd, int lParam);

        public static IntPtr[] GetDesktopWindowHandles(IntPtr hDesktop)
        {
            handlesBuf.Clear();
            EnumDesktopWindows(hDesktop, new EnumDesktopWindowsDelegate(EnumDesktopWindowsProc), IntPtr.Zero);
            IntPtr[] res = handlesBuf.ToArray();
            handlesBuf.Clear();
            return res;
        }

        private static List<IntPtr> handlesBuf = new List<IntPtr>();
        private static bool EnumDesktopWindowsProc(IntPtr hWnd, int notused)
        {
            handlesBuf.Add(hWnd);
            return true;
        }

        [DllImport("user32.dll", SetLastError = true)]
        public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        static extern int GetWindowTextLength(IntPtr hWnd);

        public static string GetWindowText(IntPtr hWnd)
        {
            // Allocate correct string length first
            int length = GetWindowTextLength(hWnd);
            StringBuilder sb = new StringBuilder(length + 1);
            GetWindowText(hWnd, sb, sb.Capacity);
            return sb.ToString();
        }

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

        [StructLayout(LayoutKind.Sequential)]
        public struct RECT
        {
            public int Left;
            public int Top;
            public int Right;
            public int Bottom;
        }
        /*
        public static Rectangle GetWindowRect(IntPtr hWnd)
        {
            RECT r = new RECT();
            if (!GetWindowRect(hWnd, out r))
                return new Rectangle();
            else
                return new Rectangle(r.Left, r.Top, r.Right - r.Left, r.Bottom - r.Top);
        }
         */

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

        unsafe public static byte[] ByteArrayFromPtr(IntPtr ptr)
        {
            byte* start = (byte*)ptr;
            byte* cur = start;
            while (*cur != 0)
                ++cur;
            int size = (int)(cur - start);
            byte[] res = new byte[size];
            Marshal.Copy(ptr, res, 0, size);
            return res;
        }

        [DllImport("user32.dll")]
        public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
        /*const int SW_HIDE = 0;
        const int SW_SHOWNORMAL = 1;
        const int SW_NORMAL = 1;
        const int SW_SHOWMINIMIZED = 2;
        const int SW_SHOWMAXIMIZED = 3;
        const int SW_MAXIMIZE = 3;*/
        public const int SW_SHOWNOACTIVATE = 4;
        /*const int SW_SHOW = 5;
        const int SW_MINIMIZE = 6;
        const int SW_SHOWMINNOACTIVE = 7;
        const int SW_SHOWNA = 8;
        const int SW_RESTORE = 9;
        const int SW_SHOWDEFAULT = 10;
        const int SW_FORCEMINIMIZE = 11;
        const int SW_MAX = 11;*/
    }

    public enum AtlasInitStatus
    {
        NOT_INITIALIZED,
        SUCCESS,
        FAILURE
    }

    public class Atlas
    {
        private static string InstallPath;
        private static bool InstallPathInitialized = false;
        public static int Version;
        private static IntPtr atlecont;
        //private static IntPtr awdict;
        //private static IntPtr awuenv;
        private static Encoding Encoding932 = Encoding.GetEncoding(932);
        public static AtlasInitStatus status = AtlasInitStatus.NOT_INITIALIZED;
        private static Mutex mutex = new Mutex();

        public static string GetInstallPath()
        {
            if (InstallPathInitialized)
                return InstallPath;
            InstallPathInitialized = true;
            InstallPath = null;
            RegistryKey key = Registry.CurrentUser.OpenSubKey(@"Software\Fujitsu\ATLAS\V14.0\JE");
            if (key == null)
            {
                key = Registry.CurrentUser.OpenSubKey(@"Software\Fujitsu\ATLAS\V13.0\JE");
                if (key == null)
                    return null;
                Version = 13;
            }
            else
            {
                Version = 14;
            }
            string res = (string)key.GetValue("TRENV JE");
            if (res == null)
                return null;
            InstallPath = Path.GetDirectoryName(res);
            return InstallPath;
        }

        private static IntPtr LoadLibrary(string name)
        {
            string path = Path.Combine(InstallPath, name);
            return PInvokeFunc.LoadLibraryEx(path, IntPtr.Zero, PInvokeFunc.LOAD_WITH_ALTERED_SEARCH_PATH);
            //return PInvokeFunc.LoadLibraryEx("C:\\RarExt.dll", IntPtr.Zero, PInvokeFunc.LOAD_WITH_ALTERED_SEARCH_PATH);
        }

        private static bool UnloadLibrary(IntPtr handle)
        {
            if (handle != IntPtr.Zero)
                return PInvokeFunc.FreeLibrary(handle);
            else
                return false;
        }

        private static bool LoadLibraries()
        {
            //Directory.SetCurrentDirectory(InstallPath);
            atlecont = LoadLibrary("AtleCont.dll");
            if (atlecont == IntPtr.Zero)
            {

                //throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
                return false;
            }
            /*awdict = LoadLibrary("awdict.dll");
            if (awdict == IntPtr.Zero)
            {
                UnloadLibrary(atlecont);
                return false;
            }
            awuenv = LoadLibrary("awuenv.dll");
            if (awuenv == IntPtr.Zero)
            {
                UnloadLibrary(atlecont);
                UnloadLibrary(awuenv);
                return false;
            }*/
            return true;
        }

        //private delegate int CreateEngineType(int x, int dir, int x3, byte[] x4);
        /// Return Type: int
        ///x: int
        ///dir: int
        ///x3: int
        ///x4: char*
        [System.Runtime.InteropServices.UnmanagedFunctionPointerAttribute(System.Runtime.InteropServices.CallingConvention.Cdecl)]
        private delegate int CreateEngineType(int x, int dir, int x3, byte[] x4);
        private static CreateEngineType CreateEngine;

        private delegate int DestroyEngineType();
        private static DestroyEngineType DestroyEngine;

        //private delegate int TranslatePairType(byte[] inp, out IntPtr outp, out IntPtr dunno, out uint maybeSize);
        /// Return Type: int
        ///in: char*
        ///out: char**
        ///dunno: void**
        ///maybeSize: unsigned int*
        [System.Runtime.InteropServices.UnmanagedFunctionPointerAttribute(System.Runtime.InteropServices.CallingConvention.Cdecl)]
        private delegate int TranslatePairType(byte[] @inp, out System.IntPtr @outp, out System.IntPtr dunno, out uint maybeSize);
        private static TranslatePairType TranslatePair;

        //private delegate int AtlInitEngineDataType(int x1, int x2, IntPtr x3, int x4, IntPtr x5, int x6, int x7, int x8, int x9);
        /// Return Type: int
        ///x1: int
        ///x2: int
        ///x3: int*
        ///x4: int
        ///x5: int*
        [System.Runtime.InteropServices.UnmanagedFunctionPointerAttribute(System.Runtime.InteropServices.CallingConvention.Cdecl)]
        private delegate int AtlInitEngineDataType(int x1, int x2, IntPtr x3, int x4, IntPtr x5);
        private static AtlInitEngineDataType AtlInitEngineData;

        //private delegate int SetTransStateType(int dunno);
        //private static SetTransStateType SetTransState;


        //private delegate int FreeAtlasDataType(IntPtr mem, IntPtr noSureHowManyArgs, IntPtr x3, IntPtr x4);
        /// Return Type: int
        ///mem: void*
        ///noSureHowManyArgs: void*
        ///param2: void*
        ///param3: void*
        [System.Runtime.InteropServices.UnmanagedFunctionPointerAttribute(System.Runtime.InteropServices.CallingConvention.Cdecl)]
        private delegate int FreeAtlasDataType(System.IntPtr mem, System.IntPtr noSureHowManyArgs, System.IntPtr x3, System.IntPtr x4);
        private static FreeAtlasDataType FreeAtlasData;

        //private delegate int AwuWordDelType(int x1, byte[] type, int x3, byte[] word);
        //private static AwuWordDelType AwuWordDel;

        private static Delegate LoadFunc(IntPtr module, string name, Type T)
        {
            IntPtr addr = PInvokeFunc.GetProcAddress(module, name);
            if (addr != IntPtr.Zero)
                return Marshal.GetDelegateForFunctionPointer(addr, T);
            else
                throw new Exception("Cannot load function " + name + "!");
        }

        private static void LoadInterface()
        {
            CreateEngine = (CreateEngineType)LoadFunc(atlecont, "CreateEngine", typeof(CreateEngineType));
            DestroyEngine = (DestroyEngineType)LoadFunc(atlecont, "DestroyEngine", typeof(DestroyEngineType));
            TranslatePair = (TranslatePairType)LoadFunc(atlecont, "TranslatePair", typeof(TranslatePairType));
            FreeAtlasData = (FreeAtlasDataType)LoadFunc(atlecont, "FreeAtlasData", typeof(FreeAtlasDataType));
            AtlInitEngineData = (AtlInitEngineDataType)LoadFunc(atlecont, "AtlInitEngineData", typeof(AtlInitEngineDataType));
            //SetTransState = (SetTransStateType)LoadFunc(atlecont, "SetTransState", typeof(SetTransStateType));
            // AwuWordDel = (AwuWordDelType)LoadFunc(awdict, "AwuWordDel", typeof(AwuWordDelType));
        }

        public static bool Initialize(string installPath)
        {
            while (initializing)
                Thread.Sleep(1);
            if (status == AtlasInitStatus.NOT_INITIALIZED)
            {
                if (InitializeInt(installPath))
                {
                    status = AtlasInitStatus.SUCCESS;
                    return true;
                }
                else
                {
                    status = AtlasInitStatus.FAILURE;
                    Deinitialize();
                    return false;
                }
            }
            else
            {
                return status == AtlasInitStatus.SUCCESS;
            }
        }

        public static void Deinitialize()
        {
            try
            {
                if (DestroyEngine != null)
                    DestroyEngine();
                UnloadLibrary(atlecont);
            }
            catch (Exception)
            { }
        }

        public static bool Ready()
        {
            return Initialize(null);
        }

        private static bool initializing = false;
        private static bool InitializeInt(string installPath)
        {
            try
            {
                initializing = true;
                if (installPath != null)
                {
                    InstallPath = installPath;
                    InstallPathInitialized = true;
                }
                else
                {
                    GetInstallPath();
                    if (InstallPath == null)
                        return false;
                }
                if (!LoadLibraries())
                    return false;
                LoadInterface();
                //if (AtlInitEngineData(0, 2, Marshal.AllocHGlobal(30000), 0, Marshal.AllocHGlobal(30000), 0, 0, 0, 0) != 0)
                if (AtlInitEngineData(0, 2, Marshal.AllocHGlobal(30000), 0, Marshal.AllocHGlobal(30000)) != 0)
                    return false;
                string env = "General";
                if (CreateEngine(1, 1, 0, Encoding932.GetBytes(env)) != 1)
                    return false;
                return true;
            }
            catch (Exception ex)
            {
                //MessageBox.Show(ex.Message);
                return false;
            }
            finally
            {
                initializing = false;
            }
        }

        public static string Translate(string source)
        {
            if (source == null)
                return source;
            bool haveLetters = false;
            foreach (char ch in source)
            {
                if (char.IsLetter(ch))
                {
                    haveLetters = true;
                    break;
                }
            }
            if (!haveLetters)
                return source;
            //long before = DateTime.Now.Ticks;
            mutex.WaitOne();
            try
            {
                IntPtr outp;
                IntPtr tmp;
                uint size;
                byte[] inp = Encoding932.GetBytes(source);
                TranslatePair(inp, out outp, out tmp, out size);
                string result;
                if (outp != IntPtr.Zero)
                {
                    result = Encoding932.GetString(PInvokeFunc.ByteArrayFromPtr(outp));
                    FreeAtlasData(outp, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero);
                }
                else
                {
                    result = null;
                }
                if (tmp != IntPtr.Zero)
                {
                    /*if (result != null)
                    {
                        string s = Encoding932.GetString(PInvokeFunc.ByteArrayFromPtr(tmp));
                        result += " [" + s + "]";
                    }*/
                    FreeAtlasData(tmp, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero);
                }
                return result;
            }
            finally
            {
                mutex.ReleaseMutex();
                //Form1.Debug(((double)(DateTime.Now.Ticks - before) / 10000000).ToString());
            }
        }

    }
}