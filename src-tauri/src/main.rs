// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use bollard::Docker;
use bollard::container::{ListContainersOptions, StartContainerOptions, StopContainerOptions, RemoveContainerOptions, LogsOptions, RestartContainerOptions, CreateContainerOptions, Config, StatsOptions, MemoryStatsStats};
use bollard::image::{ListImagesOptions, RemoveImageOptions, CreateImageOptions};
use bollard::volume::{ListVolumesOptions, RemoveVolumeOptions, CreateVolumeOptions};
use bollard::network::{ListNetworksOptions, CreateNetworkOptions};
use futures_util::stream::StreamExt;
use serde::Serialize;
use std::collections::HashMap;

#[derive(Serialize)]
struct ContainerInfo {
    id: String,
    name: String,
    image: String,
    status: String,
    state: String,
    ports: String,
}

#[derive(Serialize)]
struct ImageInfo {
    id: String,
    repository: String,
    tag: String,
    size: String,
    created: String,
}

#[derive(Serialize)]
struct VolumeInfo {
    name: String,
    driver: String,
    mountpoint: String,
}

#[derive(Serialize)]
struct NetworkInfo {
    id: String,
    name: String,
    driver: String,
    scope: String,
}

#[derive(Serialize)]
struct StackInfo {
    name: String,
    status: String,
    services: usize,
}

#[tauri::command]
async fn get_containers() -> Result<Vec<ContainerInfo>, String> {
    let docker = Docker::connect_with_local_defaults().map_err(|e| e.to_string())?;
    let containers = docker
        .list_containers(Some(ListContainersOptions::<String> {
            all: true,
            ..Default::default()
        }))
        .await
        .map_err(|e| e.to_string())?;

    Ok(containers
        .into_iter()
        .map(|c| ContainerInfo {
            id: c.id.unwrap_or_default(),
            name: c.names.unwrap_or_default().first().map(|s| s.trim_start_matches('/').to_string()).unwrap_or_else(|| "unnamed".to_string()),
            image: c.image.unwrap_or_default(),
            status: c.state.unwrap_or_default(),
            state: c.status.unwrap_or_default(),
            ports: c.ports.unwrap_or_default().iter().map(|p| {
                let typ = match &p.typ {
                    Some(bollard::models::PortTypeEnum::TCP) => "tcp",
                    Some(bollard::models::PortTypeEnum::UDP) => "udp",
                    Some(bollard::models::PortTypeEnum::SCTP) => "sctp",
                    _ => "",
                };
                if let Some(pub_port) = p.public_port {
                    format!("{}:{}->{}/{}", p.ip.as_deref().unwrap_or(""), pub_port, p.private_port, typ)
                } else {
                    format!("{}/{}", p.private_port, typ)
                }
            }).collect::<Vec<_>>().join(", "),
        })
        .collect())
}

#[tauri::command]
async fn get_images() -> Result<Vec<ImageInfo>, String> {
    let docker = Docker::connect_with_local_defaults().map_err(|e| e.to_string())?;
    let images = docker
        .list_images(Some(ListImagesOptions::<String> {
            all: true,
            ..Default::default()
        }))
        .await
        .map_err(|e| e.to_string())?;

    Ok(images
        .into_iter()
        .map(|img| {
            let repo_tag = img.repo_tags.first().cloned().unwrap_or_else(|| "none:none".to_string());
            let parts: Vec<&str> = repo_tag.split(':').collect();
            ImageInfo {
                id: img.id.replace("sha256:", "").chars().take(12).collect(),
                repository: parts.first().unwrap_or(&"none").to_string(),
                tag: parts.get(1).unwrap_or(&"none").to_string(),
                size: format!("{:.2} MB", img.size as f64 / 1024.0 / 1024.0),
                created: img.created.to_string(),
            }
        })
        .collect())
}

#[tauri::command]
async fn start_container(id: String) -> Result<(), String> {
    let docker = Docker::connect_with_local_defaults().map_err(|e| e.to_string())?;
    docker.start_container(&id, None::<StartContainerOptions<String>>).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn stop_container(id: String) -> Result<(), String> {
    let docker = Docker::connect_with_local_defaults().map_err(|e| e.to_string())?;
    docker.stop_container(&id, None::<StopContainerOptions>).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn restart_container(id: String) -> Result<(), String> {
    let docker = Docker::connect_with_local_defaults().map_err(|e| e.to_string())?;
    docker.restart_container(&id, None::<RestartContainerOptions>).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_container(id: String) -> Result<(), String> {
    let docker = Docker::connect_with_local_defaults().map_err(|e| e.to_string())?;
    docker.remove_container(&id, None::<RemoveContainerOptions>).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_container(name: String, image: String) -> Result<(), String> {
    let docker = Docker::connect_with_local_defaults().map_err(|e| e.to_string())?;
    let options = Some(CreateContainerOptions {
        name,
        ..Default::default()
    });
    let config = Config {
        image: Some(image),
        ..Default::default()
    };
    docker.create_container(options, config).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn delete_image(id: String) -> Result<(), String> {
    let docker = Docker::connect_with_local_defaults().map_err(|e| e.to_string())?;
    docker.remove_image(&id, None::<RemoveImageOptions>, None).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn pull_image(image: String) -> Result<(), String> {
    let docker = Docker::connect_with_local_defaults().map_err(|e| e.to_string())?;
    
    // Ensure the image name includes a tag if missing
    let full_image = if image.contains(':') {
        image
    } else {
        format!("{}:latest", image)
    };

    let mut stream = docker.create_image(
        Some(CreateImageOptions {
            from_image: full_image,
            ..Default::default()
        }),
        None,
        None,
    );

    while let Some(item) = stream.next().await {
        match item {
            Ok(progress) => {
                if let Some(error) = progress.error {
                    return Err(format!("Docker pull error: {}", error));
                }
            }
            Err(e) => return Err(format!("Docker stream error: {}", e)),
        }
    }

    Ok(())
}

#[tauri::command]
async fn get_volumes() -> Result<Vec<VolumeInfo>, String> {
    let docker = Docker::connect_with_local_defaults().map_err(|e| e.to_string())?;
    let volumes = docker.list_volumes(None::<ListVolumesOptions<String>>).await.map_err(|e| e.to_string())?;
    
    Ok(volumes.volumes.unwrap_or_default().into_iter().map(|v| VolumeInfo {
        name: v.name,
        driver: v.driver,
        mountpoint: v.mountpoint,
    }).collect())
}

#[tauri::command]
async fn get_networks() -> Result<Vec<NetworkInfo>, String> {
    let docker = Docker::connect_with_local_defaults().map_err(|e| e.to_string())?;
    let networks = docker.list_networks(None::<ListNetworksOptions<String>>).await.map_err(|e| e.to_string())?;
    
    Ok(networks.into_iter().map(|n| NetworkInfo {
        id: n.id.unwrap_or_default().chars().take(12).collect(),
        name: n.name.unwrap_or_default(),
        driver: n.driver.unwrap_or_default(),
        scope: n.scope.unwrap_or_default(),
    }).collect())
}

#[tauri::command]
async fn delete_volume(name: String) -> Result<(), String> {
    let docker = Docker::connect_with_local_defaults().map_err(|e| e.to_string())?;
    docker.remove_volume(&name, None::<RemoveVolumeOptions>).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_volume(name: String) -> Result<(), String> {
    let docker = Docker::connect_with_local_defaults().map_err(|e| e.to_string())?;
    let options = CreateVolumeOptions {
        name,
        ..Default::default()
    };
    docker.create_volume(options).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn delete_network(id: String) -> Result<(), String> {
    let docker = Docker::connect_with_local_defaults().map_err(|e| e.to_string())?;
    docker.remove_network(&id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_network(name: String) -> Result<(), String> {
    let docker = Docker::connect_with_local_defaults().map_err(|e| e.to_string())?;
    let options = CreateNetworkOptions {
        name,
        ..Default::default()
    };
    docker.create_network(options).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_container_logs(id: String) -> Result<String, String> {
    let docker = Docker::connect_with_local_defaults().map_err(|e| e.to_string())?;
    let mut logs = docker.logs(&id, Some(LogsOptions::<String> {
        stdout: true,
        stderr: true,
        timestamps: true,
        tail: "100".to_string(),
        ..Default::default()
    }));

    let mut output = String::new();
    while let Some(log) = logs.next().await {
        match log {
            Ok(log) => output.push_str(&log.to_string()),
            Err(e) => return Err(e.to_string()),
        }
    }
    Ok(output)
}

#[derive(Serialize)]
struct ContainerStats {
    cpu_percent: f64,
    memory_usage: u64,
    memory_limit: u64,
}

#[tauri::command]
async fn get_container_stats(id: String) -> Result<ContainerStats, String> {
    let docker = Docker::connect_with_local_defaults().map_err(|e| e.to_string())?;
    
    let mut stats_stream = docker.stats(&id, Some(StatsOptions {
        stream: false,
        one_shot: false,
    }));

    if let Some(Ok(stats)) = stats_stream.next().await {
        let cpu_delta = stats.cpu_stats.cpu_usage.total_usage as f64 - stats.precpu_stats.cpu_usage.total_usage as f64;
        let system_delta = stats.cpu_stats.system_cpu_usage.unwrap_or(0) as f64 - stats.precpu_stats.system_cpu_usage.unwrap_or(0) as f64;
        let mut cpu_percent = 0.0;
        
        if system_delta > 0.0 && cpu_delta > 0.0 {
            let num_cpus = stats.cpu_stats.online_cpus.unwrap_or(1) as f64;
            cpu_percent = (cpu_delta / system_delta) * num_cpus * 100.0;
        }

        let memory_usage = stats.memory_stats.usage.unwrap_or(0);
        let memory_limit = stats.memory_stats.limit.unwrap_or(0);
        
        let mut actual_memory = memory_usage;
        if let Some(stats_detail) = stats.memory_stats.stats {
            match stats_detail {
                MemoryStatsStats::V1(v1) => {
                    actual_memory = memory_usage.saturating_sub(v1.cache);
                }
                MemoryStatsStats::V2(v2) => {
                    actual_memory = memory_usage.saturating_sub(v2.inactive_file);
                }
            }
        }

        return Ok(ContainerStats {
            cpu_percent,
            memory_usage: actual_memory,
            memory_limit,
        });
    }

    Err("Could not get stats".into())
}

#[tauri::command]
async fn get_stacks() -> Result<Vec<StackInfo>, String> {
    let docker = Docker::connect_with_local_defaults().map_err(|e| e.to_string())?;
    let containers = docker
        .list_containers(Some(ListContainersOptions::<String> {
            all: true,
            ..Default::default()
        }))
        .await
        .map_err(|e| e.to_string())?;

    let mut stacks: HashMap<String, (usize, bool)> = HashMap::new();

    for c in containers {
        if let Some(labels) = c.labels {
            if let Some(stack_name) = labels.get("com.docker.compose.project") {
                let entry = stacks.entry(stack_name.clone()).or_insert((0, true));
                entry.0 += 1;
                if c.state.as_deref() != Some("running") {
                    entry.1 = false;
                }
            }
        }
    }

    Ok(stacks
        .into_iter()
        .map(|(name, (services, all_running))| StackInfo {
            name,
            services,
            status: if all_running { "running".into() } else { "degraded".into() },
        })
        .collect())
}

#[tauri::command]
async fn deploy_stack(name: String, compose_content: String) -> Result<(), String> {
    // Basic implementation: we'd ideally use docker-compose CLI or bollard-compose
    // For now, we'll write to a temp file and run docker-compose up
    use std::io::Write;
    let mut temp_file = std::env::temp_dir();
    temp_file.push(format!("compose-{}.yaml", name));
    
    let mut file = std::fs::File::create(&temp_file).map_err(|e| e.to_string())?;
    file.write_all(compose_content.as_bytes()).map_err(|e| e.to_string())?;

    let output = std::process::Command::new("docker")
        .arg("compose")
        .arg("-p")
        .arg(&name)
        .arg("-f")
        .arg(&temp_file)
        .arg("up")
        .arg("-d")
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(())
}

#[tauri::command]
async fn remove_stack(name: String) -> Result<(), String> {
    let output = std::process::Command::new("docker")
        .arg("compose")
        .arg("-p")
        .arg(&name)
        .arg("down")
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_containers,
            get_images,
            get_volumes,
            get_networks,
            get_stacks,
            deploy_stack,
            remove_stack,
            start_container,
            stop_container,
            restart_container,
            delete_container,
            create_container,
            delete_image,
            pull_image,
            delete_volume,
            create_volume,
            delete_network,
            create_network,
            get_container_logs,
            get_container_stats
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
