VBoxManage.exe setextradata "UbuntuSys" "VBoxInternal/Devices/e1000/0/LUN#0/Config/nodeserver/Protocol" TCP
VBoxManage.exe setextradata "UbuntuSys" "VBoxInternal/Devices/e1000/0/LUN#0/Config/nodeserver/GuestPort" 3000
VBoxManage.exe setextradata "UbuntuSys" "VBoxInternal/Devices/e1000/0/LUN#0/Config/nodeserver/HostPort" 3000
VBoxManage.exe setextradata "UbuntuSys" "VBoxInternal/Devices/e1000/0/LUN#0/Config/rabbitmq/Protocol" TCP
VBoxManage.exe setextradata "UbuntuSys" "VBoxInternal/Devices/e1000/0/LUN#0/Config/rabbitmq/GuestPort" 5672
VBoxManage.exe setextradata "UbuntuSys" "VBoxInternal/Devices/e1000/0/LUN#0/Config/rabbitmq/HostPort" 5672
