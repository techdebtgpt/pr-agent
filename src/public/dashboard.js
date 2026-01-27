document.addEventListener('DOMContentLoaded', async () => {
    // Theme Toggle Logic
    const themeToggleBtn = document.getElementById('theme-toggle');

    function applyTheme(isDark) {
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }

    // Check preference
    const isDark = localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    applyTheme(isDark);

    themeToggleBtn.addEventListener('click', () => {
        const isCurrentlyDark = document.documentElement.classList.contains('dark');
        localStorage.theme = isCurrentlyDark ? 'light' : 'dark';
        applyTheme(!isCurrentlyDark);
        // Reload to update charts colors if necessary
        location.reload(); 
    });

    try {
        const response = await fetch('/dashboard/api/stats');
        const data = await response.json();

        if (data.error) {
            console.error('Error fetching data:', data.error);
            return;
        }

        renderStats(data.stats);
        renderCharts(data.stats);
        renderTable(data.recent);
        
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
    }
});

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(amount);
}

function formatTokens(tokens) {
    if (tokens >= 1000000) {
        return (tokens / 1000000).toFixed(1) + 'M';
    } else if (tokens >= 1000) {
        return (tokens / 1000).toFixed(1) + 'K';
    }
    return tokens.toString();
}

function renderStats(stats) {
    document.getElementById('stats-total-prs').textContent = stats.totalPRs;
    document.getElementById('stats-success-rate').textContent = `${stats.successRate.toFixed(1)}%`;
    document.getElementById('stats-avg-complexity').textContent = stats.avgComplexity.toFixed(1);
    
    // Dashboard improvements (PR #13) - Unit tests created & terraform cost
    if (stats.metrics) {
        document.getElementById('stats-tests-created').textContent = stats.metrics.testsCreated;
        const cost = formatCurrency(stats.metrics.terraformCost);
        document.getElementById('stats-terraform-cost').textContent = cost;
    }

    // DevOps/Infrastructure Cost Stats Rendering (v0.2.0)
    if (stats.devOpsCosts) {
        document.getElementById('stats-devops-cost').textContent = formatCurrency(stats.devOpsCosts.totalMonthlyEstimate || 0) + '/mo';
        document.getElementById('stats-devops-count').textContent = stats.devOpsCosts.analysesWithDevOps || 0;
        document.getElementById('stats-test-suggestions').textContent = stats.devOpsCosts.testSuggestionStats?.totalSuggestions || 0;
        
        // Use average coverage from both metrics and devOpsCosts (prefer devOpsCosts as it's more specific)
        const avgCoverage = stats.devOpsCosts.coverageStats?.averageCoverage || stats.metrics?.avgCoverage || 0;
        document.getElementById('stats-avg-coverage').textContent = avgCoverage > 0 ? `${avgCoverage.toFixed(1)}%` : 'N/A';
    } else {
        document.getElementById('stats-devops-cost').textContent = '$0.00/mo';
        document.getElementById('stats-devops-count').textContent = '0';
        document.getElementById('stats-test-suggestions').textContent = '0';
        
        // Fallback to metrics if devOpsCosts not available
        const avgCoverage = stats.metrics?.avgCoverage || 0;
        document.getElementById('stats-avg-coverage').textContent = avgCoverage > 0 ? `${avgCoverage.toFixed(1)}%` : 'N/A';
    }

    // Render Recommendations
    const recList = document.getElementById('recommendations-list');
    recList.innerHTML = '';
    
    if (stats.commonRecommendations && stats.commonRecommendations.length > 0) {
        stats.commonRecommendations.forEach(item => {
            const div = document.createElement('div');
            div.className = 'flex items-start';
            div.innerHTML = `
                <span class="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-bold text-xs mr-3">
                    ${item.count}
                </span>
                <p class="text-sm text-gray-700 dark:text-gray-300">${item.text}</p>
            `;
            recList.appendChild(div);
        });
    } else {
        recList.innerHTML = '<p class="text-gray-500 dark:text-gray-400 italic">No recurring recommendations yet.</p>';
    }
}

function renderCharts(stats) {
    // Creators Chart
    const creatorsCtx = document.getElementById('chart-creators').getContext('2d');
    
    // Prepare data
    const labels = stats.perCreator.map(c => c.author);
    const counts = stats.perCreator.map(c => c.count);
    const complex = stats.perCreator.map(c => c.avg_complexity);

    new Chart(creatorsCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'PR Count',
                    data: counts,
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Avg Complexity',
                    data: complex,
                    type: 'line',
                    borderColor: 'rgb(234, 179, 8)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgb(234, 179, 8)',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Number of PRs' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'Complexity (1-5)' },
                    min: 0,
                    max: 5,
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            }
        }
    });

    // JIRA Compliance Chart
    // Default to 0s if not present (placeholder)
    const jiraData = stats.jiraCompliance || { satisfied: 0, missed: 0 };
    const jiraCtx = document.getElementById('chart-jira').getContext('2d');
    
    new Chart(jiraCtx, {
        type: 'bar',
        data: {
            labels: ['Satisfied Review', 'Missed Requirements'],
            datasets: [{
                label: 'PR Count',
                data: [jiraData.satisfied, jiraData.missed],
                backgroundColor: [
                    'rgba(34, 197, 94, 0.6)', // Green
                    'rgba(239, 68, 68, 0.6)'  // Red
                ],
                borderColor: [
                    'rgb(34, 197, 94)',
                    'rgb(239, 68, 68)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', 
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 },
                    title: { display: true, text: 'Number of PRs' }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw}`;
                        }
                    }
                }
            }
        }
    });

    // Trend Chart
    const trendCtx = document.getElementById('chart-trend').getContext('2d');
    
    const trendLabels = stats.qualityTrend.map(t => t.date);
    const trendData = stats.qualityTrend.map(t => t.avg_complexity);
    
    new Chart(trendCtx, {
        type: 'line',
        data: {
            labels: trendLabels,
            datasets: [{
                label: 'Avg Daily Complexity',
                data: trendData,
                borderColor: 'rgb(79, 70, 229)',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 5,
                    title: { display: true, text: 'Complexity Score' }
                }
            }
        }
    });

    // Complexity Chart
    const complexityCtx = document.getElementById('chart-complexity').getContext('2d');
    new Chart(complexityCtx, {
        type: 'doughnut',
        data: {
            labels: ['Low (1-2) - Good', 'Medium (3-4) - Watch', 'High (5) - Risky'],
            datasets: [{
                data: stats.complexityDistribution || [0, 0, 0],
                backgroundColor: [
                    'rgb(34, 197, 94)', // Green
                    'rgb(234, 179, 8)', // Yellow
                    'rgb(239, 68, 68)'  // Red
                ],
                borderWidth: 0
            }]
        },
        options: {
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });

    // DevOps Resource Types Chart (v0.2.0)
    if (stats.devOpsCosts && stats.devOpsCosts.resourceTypes && Object.keys(stats.devOpsCosts.resourceTypes).length > 0) {
        const devOpsCtx = document.getElementById('chart-devops-resources').getContext('2d');
        const resourceLabels = Object.keys(stats.devOpsCosts.resourceTypes);
        const resourceData = Object.values(stats.devOpsCosts.resourceTypes);
        
        new Chart(devOpsCtx, {
            type: 'doughnut',
            data: {
                labels: resourceLabels.map(r => r.toUpperCase()),
                datasets: [{
                    data: resourceData,
                    backgroundColor: [
                        'rgb(16, 185, 129)', // Green (EC2)
                        'rgb(245, 158, 11)', // Amber (Lambda)
                        'rgb(59, 130, 246)', // Blue (S3)
                        'rgb(139, 92, 246)', // Purple (RDS)
                        'rgb(236, 72, 153)', // Pink (ECS)
                        'rgb(244, 63, 94)',  // Rose (Others)
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.parsed} PRs`;
                            }
                        }
                    }
                }
            }
        });
    } else {
        // Show placeholder when no DevOps data
        const devOpsContainer = document.getElementById('chart-devops-resources');
        if (devOpsContainer) {
            devOpsContainer.parentElement.innerHTML = '<p class="text-gray-500 text-center py-8">No DevOps/IaC changes detected yet.</p>';
        }
    }

    // DevOps Cost Trend Chart (v0.2.0)
    if (stats.devOpsCosts && stats.devOpsCosts.costTrend && stats.devOpsCosts.costTrend.length > 0) {
        const costTrendCtx = document.getElementById('chart-cost-trend').getContext('2d');
        const trendLabels = stats.devOpsCosts.costTrend.map(t => t.date);
        const trendData = stats.devOpsCosts.costTrend.map(t => t.cost);
        
        new Chart(costTrendCtx, {
            type: 'line',
            data: {
                labels: trendLabels,
                datasets: [{
                    label: 'Daily DevOps Cost',
                    data: trendData,
                    borderColor: 'rgb(16, 185, 129)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Cost ($)' },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(2);
                            }
                        }
                    },
                    x: {
                        title: { display: true, text: 'Date' }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Cost: $' + context.parsed.y.toFixed(2);
                            }
                        }
                    }
                }
            }
        });
    } else {
        // Show placeholder when no cost trend data
        const costTrendContainer = document.getElementById('chart-cost-trend');
        if (costTrendContainer) {
            costTrendContainer.parentElement.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">No cost trend data available yet.</p>';
        }
    }
}

function renderTable(recent) {
    const tbody = document.getElementById('table-recent-body');
    tbody.innerHTML = '';

    recent.forEach(row => {
        const tr = document.createElement('tr');
        
        // Format Date
        const date = new Date(row.timestamp).toLocaleDateString();
        
        // Format DevOps Cost (v0.2.0)
        const cost = row.devops_cost_monthly ? formatCurrency(row.devops_cost_monthly) + '/mo' : '-';
        let costTitle = '';
        if (row.devops_resources) {
            try {
                const resources = JSON.parse(row.devops_resources);
                costTitle = resources.map(r => r.resourceType).join(', ');
            } catch (e) {
                costTitle = 'AWS infrastructure cost estimate';
            }
        }

        // Construct link URL - prefer Jira ticket if available, otherwise GitHub PR
        let linkUrl, linkText;
        if (row.ticket_key) {
            // Jira ticket link (assumes ipanovritech.atlassian.net, can be made configurable)
            linkUrl = `https://ipanovritech.atlassian.net/browse/${row.ticket_key}`;
            linkText = row.ticket_key;
        } else {
            // GitHub PR link
            linkUrl = `https://github.com/${row.repo_owner}/${row.repo_name}/pull/${row.pr_number}`;
            linkText = `#${row.pr_number}`;
        }

        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <a href="${linkUrl}" target="_blank" class="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:underline">
                    ${linkText}
                </a>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${row.repo_owner}/${row.repo_name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${row.author}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getComplexityColor(row.complexity)}">
                    ${row.complexity}/5
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${row.risks_count}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400" title="${costTitle}">${cost}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${date}</td>
        `;
        tbody.appendChild(tr);
    });
}

function getComplexityColor(score) {
    if (score < 3) return 'bg-green-100 text-green-800';
    if (score < 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
}
