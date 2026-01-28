import React, { useState, useRef, useEffect } from 'react';
import Spline from '@splinetool/react-spline';
import ContentPanel from './ContentPanel';
import Navigation from './Navigation';
import GalaxyBackground from './GalaxyBackground';
import type { ContentData } from './types';
import './InteractiveRoom.css';
import type { Application } from '@splinetool/runtime';

const InteractiveRoom: React.FC = () => {
  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [hoveredObject, setHoveredObject] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [hotspotPositions, setHotspotPositions] = useState<Record<string, { x: number; y: number; visible: boolean }>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const splineRef = useRef<Application | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  const MOUSE_ICON = '/icons/mouse.png';
  const PINCH_ICON = '/icons/pinch.png';

  // spline object name -> hotspot id
  const objects: Record<string, string> = {
    'Server Rack': 'server-rack',
    'Computer': 'computer',
    'Books': 'books',
    'Sticky Notes': 'sticky-notes'
  };

  const content: Record<string, ContentData> = {
    'server-rack': {
      title: 'Home Lab',
      subtitle: 'Where I self host and work on networking',
      items: [
        {
          title: 'Live Dashboard',
          description: 'Real-time monitoring of containers, services, resource utilization, and network topology',
          tags: ['React', 'Upstash', 'Redis'],
          link: '/HomeLab',
        },
        {
          title: 'Proxmox',
          description: 'Running 15 containers - couple postgres instances, some FastAPI apps, media server. NAS for Storage',
          tags: ['Proxmox', 'Docker', 'LXC', 'Networks'],
        },
        {
          title: 'Networking',
          description: 'Pi-hole blocks ads, Tailscale so I can access my server remotely, Jellyfin for music/movies/etc',
          tags: ['Pi-hole', 'Tailscale', 'Jellyfin'],
        }
      ]
    },
    computer: {
      title: 'Projects',
      subtitle: 'Personal and Work Projects at a high level',
      items: [
        {
          title: 'Algorithmic Trading Bot',
          description: 'ML-powered trading bot with 5 strategy groups — momentum, mean reversion, technical, sentiment, and ML ensemble. Scans 2000+ assets, ranks by composite score, and executes via Alpaca.',
          tags: ['React', 'TypeScript', 'ML', 'Alpaca'],
          link: '/TradingBot',
        },
        {
          title: 'NutriOne',
          description: 'Nutrition tracking app - PostgreSQL & FastAPI backend, React frontend. Trained a YOLOv8 model',
          tags: ['FastAPI', 'PostgreSQL', 'React', 'YOLOv8'],
        },
        {
          title: 'Plant Monitor',
          description: 'ESP32s with sensors talking to a TimescaleDB. Built an LSTM to predict when my plants need water, more sun/humidity/soil quality/ etc',
          tags: ['ESP32', 'TimescaleDB', 'PyTorch'],
        },
        {
          title: 'LLM Reports',
          description: 'Created Power Automate Flow at work to process reports so managers don\'t',
          tags: ['Automation', 'RAG', 'Power Automate'],
        },
        {
          title: 'Workday App',
          description: 'Time tracking app that\'s on the Workday Marketplace.',
          tags: ['Workday Extend', 'Enterprise', 'Full Stack'],
        }
      ]
    },
    books: {
      title: 'Work',
      subtitle: 'Professional Experience',
      items: [
        {
          title: 'Huron Consulting Group',
          description: 'Analyst building Workday apps and data pipelines.',
          tags: ['Workday', 'WQL', 'Studio', 'Extend', 'Integrations', 'Orchestrations', 'ServiceNow'],
        },
        {
          title: 'Huron Consulting Group',
          description: 'Intern - building Workday apps.',
          tags: ['Workday', 'WQL', 'Extend', 'Orchestrations'],
        },
        {
          title: 'PwC',
          description: 'Intern - built dashboards and automated workflows.',
          tags: ['Alteryx', 'Tableau'],
        },
        {
          title: 'EY',
          description: 'Non-Profit Consulting',
          tags: ['Alteryx', 'Tableau'],
        },
        {
          title: 'Education',
          description: 'UTDallas \'24, CIS degree, honors program, EY Scholarship. Currently pursuing a masters in Data Science with intent to become an ML Engineer',
          tags: ['UTDallas', 'Computer Information Systems', 'Masters in Data Science soon'],
        }
      ]
    },
    'sticky-notes': {
      title: 'Interests',
      subtitle: 'Things I enjoy doing outside of work',
      items: [
        {
          title: 'Olympic Weightlifting',
          description: 'Habit that keeps me healthy, Have competed at the national level for 3+ years',
          tags: ['Fitness'],
        },
        {
          title: 'Rock Climbing',
          description: 'Mostly bouldering. It\'s like debugging but you fall sometimes',
          tags: ['Bouldering'],
        },
        {
          title: 'Others',
          description: 'Chess, volleyball/basketball, Cello',
          tags: ['Chess', 'Sports'],
        }
      ]
    }
  };


  const onSplineLoad = (spline: Application) => {
    splineRef.current = spline;

    const checkMobile = () => {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        (navigator.maxTouchPoints ? navigator.maxTouchPoints > 0 : false);
    };
    setIsMobile(checkMobile());

    // let the welcome screen do its thing
    setTimeout(() => {
      setIsLoaded(true);
      setTimeout(() => setShowWelcome(false), 1200);
    }, 1000);

    spline.addEventListener('mouseDown', (e: any) => {
      if (e.target && e.target.name) {
        const objectName = e.target.name;
        const hotspotId = objects[objectName];

        if (hotspotId) {
          handleHotspotClick(hotspotId);
        }
      }
    });

    spline.addEventListener('mouseHover', (e: any) => {
      if (e.target && e.target.name) {
        const objectName = e.target.name;
        const hotspotId = objects[objectName];

        if (hotspotId) {
          setHoveredObject(hotspotId);
          if (containerRef.current) {
            containerRef.current.style.cursor = 'pointer';
          }
        }
      }
    });

    spline.addEventListener('mouseUp', () => {
      setHoveredObject(null);
      if (containerRef.current) {
        containerRef.current.style.cursor = 'default';
      }
    });
  };

  const handleHotspotClick = (hotspotId: string) => {
    setSelectedHotspot(selectedHotspot === hotspotId ? null : hotspotId);
  };

  const handleCloseContent = () => {
    setSelectedHotspot(null);
  };

  // 3d -> 2d projection for the hotspot buttons
  useEffect(() => {
    if (!isLoaded || !splineRef.current || !containerRef.current) return;

    let lastPositions: Record<string, { x: number; y: number; visible: boolean }> = {};
    let smoothedPositions: Record<string, { x: number; y: number }> = {};

    const updateHotspotPositions = () => {
      const spline = splineRef.current;
      const container = containerRef.current;
      if (!spline || !container) {
        animationFrameRef.current = requestAnimationFrame(updateHotspotPositions);
        return;
      }

      try {
        const newPositions: Record<string, { x: number; y: number; visible: boolean }> = {};
        const hotspotIds = Array.from(new Set(Object.values(objects)));

        hotspotIds.forEach((hotspotId) => {
          const objectName = Object.keys(objects).find(key => objects[key] === hotspotId);
          if (!objectName) return;

          try {
            const obj = spline.findObjectByName(objectName);
            if (obj && obj.position) {
              const splineInternal = spline as any;
              const camera = splineInternal._camera;
              if (!camera) return;

              const objInternal = obj as any;

              if (objInternal.updateMatrixWorld) {
                objInternal.updateMatrixWorld();
              }

              let worldX = obj.position.x;
              let worldY = obj.position.y;
              let worldZ = obj.position.z;

              if (objInternal.getWorldPosition) {
                const Vector3 = objInternal.position.constructor;
                const worldPos = objInternal.getWorldPosition(new Vector3());
                worldX = worldPos.x;
                worldY = worldPos.y;
                worldZ = worldPos.z;
              }

              const Vector3 = objInternal.position.constructor;
              const vector = new Vector3(worldX, worldY, worldZ);

              if (vector.project) {
                vector.project(camera);

                const containerRect = container.getBoundingClientRect();
                const targetX = (vector.x * 0.5 + 0.5) * containerRect.width;
                const targetY = (-(vector.y * 0.5) + 0.5) * containerRect.height;

                if (!smoothedPositions[hotspotId]) {
                  smoothedPositions[hotspotId] = { x: targetX, y: targetY };
                }

                const lerp = 0.15;
                smoothedPositions[hotspotId].x += (targetX - smoothedPositions[hotspotId].x) * lerp;
                smoothedPositions[hotspotId].y += (targetY - smoothedPositions[hotspotId].y) * lerp;

                const visible = vector.z < 1 &&
                              targetX >= 0 && targetX <= containerRect.width &&
                              targetY >= 0 && targetY <= containerRect.height;

                newPositions[hotspotId] = {
                  x: Math.round(smoothedPositions[hotspotId].x),
                  y: Math.round(smoothedPositions[hotspotId].y),
                  visible
                };
              }
            }
          } catch {
            // object not found
          }
        });

        // only update state if positions actually moved
        const hasChanged = Object.keys(newPositions).some(key => {
          const last = lastPositions[key];
          const current = newPositions[key];
          if (!last || !current) return true;
          return Math.abs(last.x - current.x) > 1 ||
                 Math.abs(last.y - current.y) > 1 ||
                 last.visible !== current.visible;
        });

        if (hasChanged) {
          lastPositions = newPositions;
          setHotspotPositions(newPositions);
        }
      } catch {
        // skip frame on error
      }

      animationFrameRef.current = requestAnimationFrame(updateHotspotPositions);
    };

    animationFrameRef.current = requestAnimationFrame(updateHotspotPositions);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isLoaded]);

  return (
    <div className="interactive-room" ref={containerRef}>
      <GalaxyBackground
        density={0.7}
        glowIntensity={0.2}
        hueShift={360}
        twinkleIntensity={0.2}
        rotationSpeed={0}
        repulsionStrength={0}
        starSpeed={0.1}
        speed={0.1}
        mouseRepulsion={false}
        mouseInteraction={false}
      />

      <Navigation />

      {showWelcome && (
        <div className={`welcome-screen ${!isLoaded ? 'active' : 'fade-out'}`}>
          <div className="welcome-content">
            <h1 className="welcome-title">
              <span className="welcome-word">Welcome</span>
              <span className="welcome-word">To</span>
              <span className="welcome-word">My</span>
              <span className="welcome-word">Room!</span>
            </h1>
            <div className="welcome-spinner">
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
            </div>
          </div>
        </div>
      )}

      <div className="spline-container">
        <Spline
          scene="https://prod.spline.design/Q4QXKyGg8LbBaE8z/scene.splinecode"
          onLoad={onSplineLoad}
        />
      </div>

      {isLoaded && !selectedHotspot && Object.entries(hotspotPositions).map(([hotspotId, pos]) => (
        pos.visible && (
          <button
            key={hotspotId}
            className="hotspot-button"
            style={{
              left: `${pos.x}px`,
              top: `${pos.y}px`,
            }}
            onClick={() => handleHotspotClick(hotspotId)}
            aria-label={`View ${content[hotspotId]?.title || hotspotId}`}
          >
            +
          </button>
        )
      ))}

      {isLoaded && hoveredObject && !selectedHotspot && (
        <div className="hover-indicator">
          <span className="hover-text">
            Click to explore {content[hoveredObject]?.title || 'this area'}
          </span>
        </div>
      )}

      {selectedHotspot && (
        <ContentPanel
          content={content[selectedHotspot]}
          onClose={handleCloseContent}
          hotspotId={selectedHotspot}
        />
      )}

      {isLoaded && !selectedHotspot && !hoveredObject && (
        <div className="instructions">
          <p className="instruction-text">
            {isMobile ? (
              <>
                <span className="click-icon">
                  <img src={PINCH_ICON} alt="Pinch gesture" />
                </span>
                Pinch to zoom and rotate • Tap objects to learn more
              </>
            ) : (
              <>
                <span className="click-icon">
                  <img src={MOUSE_ICON} alt="Mouse" />
                </span>
                Move your mouse to explore • Click objects to learn more
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default InteractiveRoom;
