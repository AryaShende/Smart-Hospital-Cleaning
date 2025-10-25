document.addEventListener("DOMContentLoaded", () => {
    const mainContent = document.getElementById("main-content");
    const logoutButton = document.getElementById("logout-button");
    const messageBox = document.getElementById("message-box");

    const API_BASE_URL = "http://127.0.0.1:5000";

    /**
     * --- Global Helper Functions ---
     */

    // Function to show a success or error message
    const showMessage = (message, isError = false) => {
        messageBox.textContent = message;
        messageBox.className = `fixed top-5 right-5 p-4 rounded-lg shadow-lg text-white ${isError ? 'bg-red-500' : 'bg-green-500'}`;
        messageBox.classList.remove("hidden");
        setTimeout(() => {
            messageBox.classList.add("hidden");
        }, 3000);
    };

    // Function to get the JWT token from local storage
    const getToken = () => localStorage.getItem("jwt_token");

    // Function to get the user's data from the JWT token
    const getUserData = () => {
        const token = getToken();
        if (!token) return null;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload;
        } catch (e) {
            console.error("Failed to parse token:", e);
            return null;
        }
    };

    /**
     * --- Page Loading & Routing Logic ---
     */

    const loadPage = async (page) => {
        try {
            const response = await fetch(`./pages/${page}.html`);
            if (!response.ok) throw new Error("Page not found");
            mainContent.innerHTML = await response.text();
            initializePageSpecificLogic(page);
        } catch (error) {
            mainContent.innerHTML = `<p class="text-red-500 text-center">Error loading page: ${error.message}</p>`;
        }
    };

    const router = () => {
        const userData = getUserData();
        if (userData) {
            logoutButton.classList.remove("hidden");
            switch (userData.role) {
                case "cleaner":
                    loadPage("cleaner");
                    break;
                case "manager":
                    loadPage("manager");
                    break;
                case "dean":
                case "bmc_commissioner":
                    loadPage("admin");
                    break;
                default:
                    loadPage("login");
                    logout();
            }
        } else {
            logoutButton.classList.add("hidden");
            // Simple hash-based routing for login/register
            if (window.location.hash === "#register") {
                loadPage("register");
            } else {
                loadPage("login");
            }
        }
    };

    /**
     * --- Event Listeners and Page-Specific Logic ---
     */
    const initializePageSpecificLogic = (page) => {
        switch (page) {
            case "login":
                setupLoginForm();
                break;
            case "register":
                setupRegisterForm();
                break;
            case "cleaner":
                setupCleanerDashboard();
                break;
            case "manager":
                setupManagerDashboard();
                break;
            case "admin":
                setupAdminDashboard();
                break;
        }
    };

    // --- Login Form ---
    const setupLoginForm = () => {
        const loginForm = document.getElementById("login-form");
        const registerLink = document.getElementById("register-link");

        if (loginForm) {
            loginForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                localStorage.removeItem("jwt_token"); 
                const formData = new FormData(loginForm);
                const data = Object.fromEntries(formData.entries());

                try {
                    const response = await fetch(`${API_BASE_URL}/login`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(data),
                    });
                    const result = await response.json();
                    if (response.ok && result.success) {
                        localStorage.setItem("jwt_token", result.token);
                        showMessage("Login successful!");
                        router();
                    } else {
                        throw new Error(result.message);
                    }
                } catch (error) {
                    showMessage(error.message, true);
                }
            });
        }
        if (registerLink) {
            registerLink.addEventListener("click", (e) => {
                e.preventDefault();
                window.location.hash = "#register";
                router();
            });
        }
    };
    
    // --- Register Form ---
    const setupRegisterForm = () => {
        const registerForm = document.getElementById("register-form");
        const loginLink = document.getElementById("login-link");

        if(registerForm) {
            registerForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const formData = new FormData(registerForm);
                const data = {
                    full_name: formData.get('fullName'),
                    email: formData.get('email'),
                    password: formData.get('password'),
                    role: formData.get('role')
                };

                try {
                    const response = await fetch(`${API_BASE_URL}/register`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(data),
                    });
                    const result = await response.json();
                    if (response.status === 201 && result.success) {
                        showMessage("Registration successful! Please log in.");
                        window.location.hash = "#login";
                        router();
                    } else {
                        throw new Error(result.message);
                    }
                } catch (error) {
                    showMessage(error.message, true);
                }
            });
        }

        if(loginLink) {
            loginLink.addEventListener("click", (e) => {
                e.preventDefault();
                window.location.hash = "#login";
                router();
            });
        }
    };

    // --- Cleaner Dashboard ---
    const setupCleanerDashboard = () => {
        const uploadForm = document.getElementById("upload-form");
        const submitButton = document.getElementById("upload-submit-button");
        const spinner = document.getElementById("upload-spinner");
        const buttonText = document.getElementById("upload-button-text");

        if (uploadForm) {
            uploadForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const formData = new FormData();
                const userData = getUserData();

                formData.append('room_id', document.getElementById('room').value);
                formData.append('after_photo', document.getElementById('photo').files[0]);
                formData.append('cleaner_id', userData.user_id);
                
                // UI changes for loading state
                submitButton.disabled = true;
                spinner.classList.remove('hidden');
                buttonText.textContent = 'Submitting...';

                try {
                    const response = await fetch(`${API_BASE_URL}/verify_room`, {
                        method: "POST",
                        body: formData,
                    });
                    const result = await response.json();
                    if (response.ok && result.success) {
                        showMessage("Work submitted successfully for verification.");
                        uploadForm.reset();
                    } else {
                        throw new Error(result.error || "Submission failed.");
                    }
                } catch (error) {
                    showMessage(error.message, true);
                } finally {
                    // Revert UI changes
                    submitButton.disabled = false;
                    spinner.classList.add('hidden');
                    buttonText.textContent = 'Submit for Verification';
                }
            });
        }
        loadCleanerTasks();
    };

    const loadCleanerTasks = async () => {
        const taskListDiv = document.getElementById("task-list");
        const userData = getUserData();
        if (!taskListDiv || !userData) return;

        try {
            const response = await fetch(`${API_BASE_URL}/tasks/${userData.user_id}`);
            const result = await response.json();
            if (result.success) {
                if (result.data.length === 0) {
                    taskListDiv.innerHTML = `<p class="text-gray-500">No tasks assigned.</p>`;
                    return;
                }
                const tasksHtml = result.data.map(task => `
                    <div class="p-4 border rounded-lg bg-gray-50">
                        <h4 class="font-bold text-lg">${task.room_id}</h4>
                        <p class="text-sm text-gray-600"><strong>Date:</strong> ${new Date(task.assignment_date).toLocaleDateString()}</p>
                        <p class="text-sm text-gray-600"><strong>Status:</strong> <span class="font-semibold ${task.status === 'Pending' ? 'text-yellow-600' : 'text-green-600'}">${task.status}</span></p>
                        <p class="mt-2 text-gray-700">${task.notes || 'No notes provided.'}</p>
                    </div>
                `).join('');
                taskListDiv.innerHTML = tasksHtml;
            } else {
                throw new Error("Failed to load tasks.");
            }
        } catch (error) {
            taskListDiv.innerHTML = `<p class="text-red-500">${error.message}</p>`;
        }
    };

    // --- Manager Dashboard ---
    const setupManagerDashboard = () => {
        const approvalList = document.getElementById("approval-list");
        if (!approvalList) return;

        const loadApprovals = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/dashboard`);
                const result = await response.json();
                if (!result.success) throw new Error("Failed to fetch approvals.");

                if (result.data.length === 0) {
                    approvalList.innerHTML = `<p class="text-gray-500">No items pending approval.</p>`;
                    return;
                }

                approvalList.innerHTML = result.data.map(item => `
                    <div class="p-4 border rounded-lg shadow-sm bg-white" id="record-${item.id}">
                        <h4 class="font-bold text-lg">${item.room_id}</h4>
                        <p class="text-gray-600 text-sm"><strong>Cleaner ID:</strong> ${item.cleaner_id.substring(0,8)}...</p>
                        <p class="text-gray-600 text-sm"><strong>Submitted:</strong> ${new Date(item.created_at).toLocaleString()}</p>
                        <p class="text-gray-600"><strong>AI Status:</strong> <span class="font-semibold">${item.cleanliness_status}</span></p>
                        <p class="text-gray-600 italic"><strong>AI Remarks:</strong> "${item.ai_remarks}"</p>
                        <div class="mt-4 flex gap-2">
                            <button class="approve-btn bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600" data-id="${item.id}">Approve</button>
                            <button class="rework-btn bg-yellow-500 text-white px-3 py-1 rounded-lg hover:bg-yellow-600" data-id="${item.id}">Rework</button>
                        </div>
                    </div>
                `).join('');
            } catch (error) {
                approvalList.innerHTML = `<p class="text-red-500">${error.message}</p>`;
            }
        };

        approvalList.addEventListener("click", async (e) => {
            const recordId = e.target.dataset.id;
            if (!recordId) return;
            
            let newStatus;
            if (e.target.classList.contains("approve-btn")) newStatus = "Approved";
            if (e.target.classList.contains("rework-btn")) newStatus = "Rework";
            
            if (newStatus) {
                try {
                    const response = await fetch(`${API_BASE_URL}/approve`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ record_id: parseInt(recordId), new_status: newStatus })
                    });
                    const result = await response.json();
                    if (result.success) {
                        showMessage(`Record ${newStatus.toLowerCase()} successfully.`);
                        document.getElementById(`record-${recordId}`).remove();
                    } else {
                        throw new Error("Failed to update status.");
                    }
                } catch(error) {
                    showMessage(error.message, true);
                }
            }
        });

        loadApprovals();
    };

    // --- Admin Dashboard ---
    const setupAdminDashboard = () => {
        const assignTaskForm = document.getElementById("assign-task-form");
        const downloadReportButton = document.getElementById("download-report-button");

        if (assignTaskForm) {
            assignTaskForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const userData = getUserData();
                const formData = new FormData(assignTaskForm);
                const data = {
                    room_id: formData.get('room'),
                    cleaner_id: formData.get('cleaner'),
                    assignment_date: formData.get('date'),
                    notes: formData.get('notes'),
                    assigned_by_id: userData.user_id
                };

                try {
                    const response = await fetch(`${API_BASE_URL}/assign_task`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    const result = await response.json();
                    if (response.ok && result.success) {
                        showMessage("Task assigned successfully.");
                        assignTaskForm.reset();
                    } else {
                        throw new Error(result.message || "Failed to assign task.");
                    }
                } catch (error) {
                    showMessage(error.message, true);
                }
            });
        }
        
        if (downloadReportButton) {
            downloadReportButton.addEventListener("click", async () => {
                try {
                    const response = await fetch(`${API_BASE_URL}/report/weekly`);
                    if (!response.ok) throw new Error("Could not download report.");

                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.style.display = "none";
                    a.href = url;
                    // Extract filename from content-disposition header
                    const disposition = response.headers.get('content-disposition');
                    let filename = "weekly-report.pdf";
                    if (disposition && disposition.indexOf('attachment') !== -1) {
                        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                        const matches = filenameRegex.exec(disposition);
                        if (matches != null && matches[1]) {
                          filename = matches[1].replace(/['"]/g, '');
                        }
                    }
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    a.remove();
                    showMessage("Report downloaded successfully.");

                } catch (error) {
                    showMessage(error.message, true);
                }
            });
        }
    };
    
    /**
     * --- Logout and Initial Setup ---
     */

    const logout = () => {
        localStorage.removeItem("jwt_token");
        window.location.hash = "#login";
        showMessage("You have been logged out.");
        router();
    };

    logoutButton.addEventListener("click", logout);

    // Handle hash changes for routing between login/register
    window.addEventListener("hashchange", router);

    // Initial load
    router();
});