import re

with open('frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the button with the new relative dropdown
dropdown_html = """            <div className="relative group">
              <button
                onClick={() => setShowAccountModal(!showAccountModal)}
                className="flex items-center gap-2 p-1 rounded-md hover:bg-slate-50 transition-colors focus:outline-none"
                title="Cuenta"
              >
                <img
                  src="/default.jpg"
                  alt="avatar"
                  className="w-8 h-8 rounded-full object-cover border border-slate-200"
                />
              </button>

              {/* Dropdown Menu */}
              {showAccountModal && (
                <>
                  {/* Invisible backdrop to close dropdown when clicking outside */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowAccountModal(false)}
                  ></div>
                  
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-slate-200 z-50 animate-fade-in-up">
                    <div className="p-3 border-b border-slate-100 flex items-center gap-3">
                      <img
                        src="/default.jpg"
                        alt="avatar"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="overflow-hidden">
                        <div className="text-sm font-semibold truncate">
                          {user ? `${user.nombre} ${user.primer_apellido}` : "Usuario"}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {user?.alias || "Cuenta de usuario"}
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-2">
                      <button
                        className="w-full text-left px-3 py-2 text-sm rounded-md text-slate-700 hover:bg-slate-50 transition-colors"
                        onClick={() => {
                          setShowAccountModal(false);
                          setModuloActivo("administracion");
                          navigate("/perfil");
                        }}
                      >
                        Ver perfil
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 text-sm rounded-md text-red-600 hover:bg-red-50 transition-colors mt-1"
                        onClick={() => {
                          setShowAccountModal(false);
                          setShowLogoutConfirm(true);
                        }}
                      >
                        Salir del sistema
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>"""

old_button_pattern = r"""            <button\s+onClick=\{\(\) => setShowAccountModal\(true\)\}\s+className="p-2 rounded-lg hover:bg-slate-50 transition-all duration-300 ease-out hover:scale-110 active:scale-95 group"\s+title="Cuenta"\s+>\s+<UserCircle className="w-5 h-5 text-gray-700 group-hover:text-blue-600 transition-colors" />\s+</button>"""

content = re.sub(old_button_pattern, dropdown_html, content, flags=re.MULTILINE | re.DOTALL)

# Remove the old modal from the bottom
modal_pattern = r"""\s+\{showAccountModal && \(\s+<div\s+className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"\s+onClick=\{\(\) => \{\s+setShowLogoutConfirm\(false\);\s+setShowAccountModal\(false\);\s+\}\}\s+>\s+<div\s+className="bg-white rounded-md shadow-2xl w-full max-w-sm p-6 transform transition-all animate-fade-in-up"\s+onClick=\{\(e\) => e.stopPropagation\(\)\}\s+>\s+<div className="flex items-center gap-3">.*?Salir del sistema\s+</button>\s+</div>\s+</div>\s+</div>\s+\)\}"""
content = re.sub(modal_pattern, "", content, flags=re.MULTILINE | re.DOTALL)

with open('frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("App.tsx updated.")
